import { PLAYER_STATE } from '../player-state.js';
import { AudioManager } from '../audio-manager.js';
import { updateWander, updateMoveToTarget, updateFollowPath } from '../player-movement.js';
import { findAndMoveToTree, beginChopping, finishChopping, startChoppingCycle } from './chopping.js';
import { startGatheringCycle, beginHarvestingLogs, finishHarvestingLogs, beginHarvestingBushes, finishHarvestingBushes, harvestNextBush } from './gathering.js';
import { updateFollow } from './following.js';
import { TILE_TYPE } from '../map-tile-types.js';

export function updateAction(player, deltaTime, gameMap, allPlayers) {
    const atMoveTarget = player.path.length === 0;

    switch (player.state) {
        case PLAYER_STATE.IDLE:
            updateWander(player, deltaTime, gameMap);
            break;

        case PLAYER_STATE.SEARCHING_FOR_TREE:
             updateWander(player, deltaTime, gameMap);
             const distFromTreeSearch = Math.sqrt(
                (player.pixelX - player.lastSearchPosition.x)**2 +
                (player.pixelY - player.lastSearchPosition.y)**2
            );
            if (distFromTreeSearch > 8) {
                findAndMoveToTree(player, gameMap);
            }
            break;

        case PLAYER_STATE.MOVING_TO_TREE:
            if (!player.actionTarget || gameMap.grid[player.actionTarget.y][player.actionTarget.x].type !== TILE_TYPE.TREE) {
                console.log(`[${player.username}] Target tree at (${player.actionTarget?.x}, ${player.actionTarget?.y}) is gone. Finding a new one.`);
                startChoppingCycle(player, gameMap);
                return;
            }
            updateFollowPath(player, deltaTime, gameMap);
            if (atMoveTarget) {
                // To make chopping feel right, we do a final small move towards the tree itself.
                const finalTargetX = player.actionTarget.x;
                const finalTargetY = player.actionTarget.y;
                const currentSpotX = Math.round(player.pixelX);
                const currentSpotY = Math.round(player.pixelY);
                player.targetX = currentSpotX + (finalTargetX - currentSpotX) * 0.4;
                player.targetY = currentSpotY + (finalTargetY - currentSpotY) * 0.4;

                const distToFinalAdjust = Math.sqrt((player.pixelX - player.targetX)**2 + (player.pixelY - player.targetY)**2);

                if (distToFinalAdjust > 0.05) {
                    updateMoveToTarget(player, deltaTime, gameMap);
                } else {
                     beginChopping(player, gameMap);
                }
            }
            break;
        case PLAYER_STATE.MOVING_TO_LOGS:
            if (!player.actionTarget || gameMap.grid[player.actionTarget.y][player.actionTarget.x].type !== TILE_TYPE.LOGS) {
                console.log(`[${player.username}] Target logs at (${player.actionTarget?.x}, ${player.actionTarget?.y}) are gone. Moving on.`);
                harvestNextBush(player, gameMap); // This function handles what to do next
                return;
            }
            updateFollowPath(player, deltaTime, gameMap);
            if (atMoveTarget) {
                beginHarvestingLogs(player, gameMap);
            }
            break;
        case PLAYER_STATE.MOVING_TO_BUSHES:
            if (!player.actionTarget || gameMap.grid[player.actionTarget.y][player.actionTarget.x].type !== TILE_TYPE.BUSHES) {
                console.log(`[${player.username}] Target bush at (${player.actionTarget?.x}, ${player.actionTarget?.y}) is gone. Moving on.`);
                harvestNextBush(player, gameMap); // This function handles what to do next
                return;
            }
            updateFollowPath(player, deltaTime, gameMap);
            if (atMoveTarget) {
                beginHarvestingBushes(player, gameMap);
            }
            break;

        case PLAYER_STATE.WANDERING_TO_GATHER:
            updateWander(player, deltaTime, gameMap);
            const distFromSearch = Math.sqrt(
                (player.pixelX - player.lastSearchPosition.x)**2 +
                (player.pixelY - player.lastSearchPosition.y)**2
            );
            if (distFromSearch > 8) {
                startGatheringCycle(player, gameMap);
            }
            break;

        case PLAYER_STATE.FOLLOWING:
             updateFollow(player, gameMap, allPlayers, deltaTime);
             break;

        case PLAYER_STATE.CHOPPING:
            // Check if another player finished chopping the tree
            if (!player.actionTarget || gameMap.grid[player.actionTarget.y][player.actionTarget.x].type !== TILE_TYPE.TREE) {
                console.log(`[${player.username}] Tree at (${player.actionTarget?.x}, ${player.actionTarget?.y}) was chopped by someone else. Finishing up.`);
                // The tree is gone, so we call finishChopping to transition to gathering
                finishChopping(player, gameMap);
                return; // Stop further processing for this frame
            }

            player.actionTimer -= deltaTime;
            if (player.actionTimer <= 0) {
                finishChopping(player, gameMap);
            } else if (Math.floor(player.actionTimer) % 2 === 0 && Math.floor(player.actionTimer + deltaTime) % 2 !== 0) {
                 const chopSound = AudioManager.getBuffer('./chop.mp3');
                 AudioManager.play(chopSound, player.pixelX, player.pixelY);
            }
            break;

        case PLAYER_STATE.HARVESTING_LOGS:
            player.actionTimer -= deltaTime;
            if (player.actionTimer <= 0) {
                finishHarvestingLogs(player, gameMap);
            }
            break;

        case PLAYER_STATE.HARVESTING_BUSHES:
            player.actionTimer -= deltaTime;
            if (player.actionTimer <= 0) {
                finishHarvestingBushes(player, gameMap);
            }
            break;
    }
}