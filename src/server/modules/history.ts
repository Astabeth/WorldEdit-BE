import { BlockLocation, MinecraftBlockTypes, Player } from 'mojang-minecraft';
import { Regions } from './regions.js';
import { getPlayerDimension, regionMin } from '../util.js';

const MAX_HISTORY_SIZE = 15;

type historyEntry = {
    name: string,
    location: BlockLocation
}

let historyId = Date.now();

export class History {
    private recording = false;

    private undoStructures: historyEntry[][] = [];
    private redoStructures: historyEntry[][] = [];
    private historyIdx = -1;

    private recordingUndo: historyEntry[];
    private recordingRedo: historyEntry[];

    private player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    reassignPlayer(player: Player) {
        this.player = player;
    }

    record() {
        this.assertNotRecording();
        this.recording = true;

        this.recordingUndo = [];
        this.recordingRedo = [];
    }

    commit() {
        this.assertRecording();
        this.recording = false;

        this.historyIdx++;
        for (let i = this.historyIdx; i < this.undoStructures.length; i++) {
            this.deleteHistoryRegions(i);
        }
        this.undoStructures.length = this.historyIdx + 1;
        this.redoStructures.length = this.historyIdx + 1;

        this.undoStructures[this.historyIdx] = this.recordingUndo;
        this.redoStructures[this.historyIdx] = this.recordingRedo;

        while (this.historyIdx > MAX_HISTORY_SIZE - 1) {
            this.deleteHistoryRegions(0);
            this.undoStructures.shift();
            this.redoStructures.shift();
            this.historyIdx--;
        }
    }

    cancel() {
        this.assertRecording();
        this.recording = false;

        for (const struct of this.recordingUndo) {
            Regions.delete(struct.name, this.player);
        }
        for (const struct of this.recordingRedo) {
            Regions.delete(struct.name, this.player);
        }
    }

    addUndoStructure(start: BlockLocation, end: BlockLocation, blocks: BlockLocation[] | 'any' = 'any') {
        this.assertRecording();
        const structName = this.processRegion(start, end, blocks);
        this.recordingUndo.push({
            'name': structName,
            'location': regionMin(start, end)
        })
    }

    addRedoStructure(start: BlockLocation, end: BlockLocation, blocks: BlockLocation[] | 'any' = 'any') {
        this.assertRecording();
        const structName = this.processRegion(start, end, blocks);
        this.recordingRedo.push({
            'name': structName,
            'location': regionMin(start, end)
        })
    }

    undo() {
        this.assertNotRecording();
        if (this.historyIdx <= -1) {
            return true;
        }

        for (const region of this.undoStructures[this.historyIdx]) {
            Regions.load(region.name, region.location, this.player, 'absolute');
        };
        this.historyIdx--;

        return false;
    }

    redo() {
        this.assertNotRecording();
        if (this.historyIdx >= this.redoStructures.length - 1) {
            return true;
        }

        this.historyIdx++;
        for (const region of this.redoStructures[this.historyIdx]) {
            Regions.load(region.name, region.location, this.player, 'absolute');
        };

        return false;
    }

    clear() {
        this.recording = true;
        this.historyIdx = -2;
        this.cancel();
    }

    private deleteHistoryRegions(index: number) {
        for (const struct of this.undoStructures[index]) {
            Regions.delete(struct.name, this.player);
        }
        for (const struct of this.redoStructures[index]) {
            Regions.delete(struct.name, this.player);
        }
    }

    private processRegion(start: BlockLocation, end: BlockLocation, blocks: BlockLocation[] | 'any') {
        const tempRegion = 'tempHistoryProcess' + historyId;
        let structName: string;

        const finish = () => {
            if (Array.isArray(blocks)) {
                Regions.load(tempRegion, loc, this.player, 'absolute');
                Regions.delete(tempRegion, this.player);
            }
        }

        try {
            // Assuming that `blocks` was made with `start.blocksBetween(end)` and then filtered.
            if (Array.isArray(blocks)) {
                var loc = regionMin(start, end);
                const dimension = getPlayerDimension(this.player)[0];
                const voidBlock = MinecraftBlockTypes.structureVoid.createDefaultBlockPermutation();
                Regions.save(tempRegion, start, end, this.player);
                let index = 0;
                for (const block of start.blocksBetween(end)) {
                    if (blocks[index]?.equals(block)) {
                        index++;
                    } else {
                        dimension.getBlock(block).setPermutation(voidBlock);
                    }
                }
            }

            structName = 'history' + historyId++;
            if (Regions.save(structName, start, end, this.player)) {
                finish();
                this.cancel();
                throw 'Failed to save history!';
            }
        } catch(err) {
            this.cancel();
            finish();
            throw err;
        }

        finish();
        return structName;
    }

    private assertRecording() {
        if (!this.recording) {
            throw 'History was not being recorded!';
        }
    }

    private assertNotRecording() {
        if (this.recording) {
            throw 'History was still being recorded!';
        }
    }

}
