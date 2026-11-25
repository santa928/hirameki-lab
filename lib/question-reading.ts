import type {Puzzle, Scene} from './engine/shared.ts';

/** Read the current board's written conditions in their displayed order. */
export function readWithBoardClues(p: Puzzle, introduction: string): string {
  const scene = p.data.scene;
  let clues: string[];

  if (p.id === 'digitorder' && scene?.type === 'text') {
    clues = [scene.text, scene.sub].filter(Boolean);
  } else if (p.id === 'order' && scene?.type === 'row') {
    clues = scene.items.map((item: Scene) => item.text);
  } else {
    return introduction;
  }

  return [introduction, ...clues].map(line => /[。！？!?]$/.test(line) ? line : line + '。').join('');
}
