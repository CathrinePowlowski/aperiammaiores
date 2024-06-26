import { Event, TargetInfo } from "@clarity-types/data";
import { SelectionData } from "@clarity-types/interaction";
import config from "@src/core/config";
import { bind } from "@src/core/event";
import { schedule } from "@src/core/task";
import { clearTimeout, setTimeout } from "@src/core/timeout";
import { track } from "@src/data/target";
import encode from "./encode";

export let data: SelectionData = null;
let previous: Selection = null;
let timeout: number = null;

export function start(): void {
    reset();
}

export function observe(root: Node): void {
    bind(root, "selectstart", recompute.bind(this, root), true);
    bind(root, "selectionchange", recompute.bind(this, root), true);
}

function recompute(root: Node): void {
    let doc = root.nodeType === Node.DOCUMENT_NODE ? root as Document : document;
    let current = doc.getSelection();

    // Bail out if we don't have a valid selection
    if (current === null) { return; }

    // Bail out if we got valid selection but not valid nodes
    // In Edge, selectionchange gets fired even on interactions like right clicks and
    // can result in null anchorNode and focusNode if there was no previous selection on page
    if (current.anchorNode === null && current.focusNode === null) { return; }

    let startNode = data.start ? (data.start as TargetInfo).node : null;
    if (previous !== null && data.start !== null && startNode !== current.anchorNode) {
        clearTimeout(timeout);
        process(Event.Selection);
    }

    data = {
        start: track(current.anchorNode),
        startOffset: current.anchorOffset,
        end: track(current.focusNode),
        endOffset: current.focusOffset
    };
    previous = current;

    clearTimeout(timeout);
    timeout = setTimeout(process, config.lookahead, Event.Selection);
}

function process(event: Event): void {
    schedule(encode.bind(this, event));
}

export function reset(): void {
    previous = null;
    data = { start: 0, startOffset: 0, end: 0, endOffset: 0 };
}

export function end(): void {
    reset();
    clearTimeout(timeout);
}
