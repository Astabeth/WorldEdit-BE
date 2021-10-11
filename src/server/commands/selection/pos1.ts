import { Player } from 'mojang-minecraft';
import { Server } from '../../../library/Minecraft.js';
import { getPlayerBlockLocation, printDebug, printLocation } from '../../util.js';

import { parsePosition } from './selection_helper.js';
import { commandList } from '../command_list.js';
import { RawText } from '../../modules/rawtext.js';

const registerInformation = {
    cancelMessage: true,
    name: 'pos1',
    description: 'Set the first position of your selection to the specified or current position',
    usage: '[coordinates]',
};

commandList['pos1'] = [registerInformation, (session, builder, args) => {
    let loc = getPlayerBlockLocation(builder);
    if (args.length > 0) {
        loc = parsePosition(args, loc);
    }
    session.setSelectionPoint(0, loc);

    let translate: string;
    if (session.getBlocksSelected().length == 0) {
        translate = 'worldedit.selection.cuboid.explain.primary';
    } else {
        translate = 'worldedit.selection.cuboid.explain.primary-area';
    }
    return RawText.translate(translate)
        .with(printLocation(session.getSelectionPoints()[0]))
        .with(`${session.getBlocksSelected().length}`);
}];
