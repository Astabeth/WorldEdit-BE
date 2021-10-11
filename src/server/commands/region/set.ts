import { BlockType, MinecraftBlockTypes, Player, World } from 'mojang-minecraft';
import { Server } from '../../../library/Minecraft.js';
import { assertBuilder } from '../../modules/assert.js';
import { getSession, PlayerSession } from '../../sessions.js';
import { getPlayerDimension, printLocation, regionMax, regionMin } from '../../util.js';
import { Pattern } from '../../modules/pattern.js';
import { commandList } from '../command_list.js';
import { RawText } from '../../modules/rawtext.js';

const registerInformation = {
    cancelMessage: true,
    name: 'set',
    description: 'Set all the blocks in the selection',
    usage: '<pattern>',
    example: [
        'set air',
        'set minecraft:stone',
        'set wool["color":"red"],dirt'
    ]
};

/*
    @return number of blocks set
*/
export function set(session: PlayerSession, pattern: Pattern) {
    let count = 0;
    const dimension = getPlayerDimension(session.getPlayer())[1];
    for (const blockLoc of session.getBlocksSelected()) {
        if (pattern.setBlock(blockLoc, dimension)) {
            continue;
        }
        count++;
    }
    return count;
}

commandList['set'] = [registerInformation, (session, builder, args) => {
    if (session.getBlocksSelected().length == 0) {
        throw 'You need to make a selection to set!';
    }
    if (args.length == 0 && !session.usePickerPattern || session.usePickerPattern && !session.getPickerPatternParsed()) {
        throw 'You need to specify a block to set the selection to!';
    }

    const history = session.getHistory();
    history.record();

    if (session.selectionMode == 'cuboid') {
        const [pos1, pos2] = session.getSelectionPoints();
        var start = regionMin(pos1, pos2);
        var end = regionMax(pos1, pos2);
        history.addUndoStructure(start, end, 'any');
    }
    
    const pattern = session.usePickerPattern ? session.getPickerPatternParsed() : Pattern.parseArg(args[0]);
    const count = set(session, pattern);
    
    history.addRedoStructure(start, end, session.selectionMode == 'cuboid' ? 'any' : []);
    history.commit();

    return RawText.translate('worldedit.set.changed').with(`${count}`);
}];
