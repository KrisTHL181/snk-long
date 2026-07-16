import type { Point } from "./point";
import type { Grid } from "./grid";
import { copyGrid, getColor, isEmpty, isInside, setColorEmpty } from "./grid";

export type Snake = Uint8Array & { _tag: "__Snake__" };

export const getHeadX = (snake: Snake) => snake[0] - 2;
export const getHeadY = (snake: Snake) => snake[1] - 2;

export const getSnakeLength = (snake: Snake) => snake.length / 2;

export const copySnake = (snake: Snake) => snake.slice() as Snake;

export const snakeEquals = (a: Snake, b: Snake) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

/**
 * return a copy of the next snake, considering that dx, dy is the direction
 */
export const nextSnake = (snake: Snake, dx: number, dy: number) => {
  const copy = new Uint8Array(snake.length);
  for (let i = 2; i < snake.length; i++) copy[i] = snake[i - 2];
  copy[0] = snake[0] + dx;
  copy[1] = snake[1] + dy;
  return copy as Snake;
};

/**
 * return true if the next snake will collide with itself
 */
export const snakeWillSelfCollide = (snake: Snake, dx: number, dy: number) => {
  const nx = snake[0] + dx;
  const ny = snake[1] + dy;

  for (let i = 2; i < snake.length - 2; i += 2)
    if (snake[i + 0] === nx && snake[i + 1] === ny) return true;

  return false;
};

export const snakeToCells = (snake: Snake): Point[] =>
  Array.from({ length: snake.length / 2 }, (_, i) => ({
    x: snake[i * 2 + 0] - 2,
    y: snake[i * 2 + 1] - 2,
  }));

export const createSnakeFromCells = (points: Point[]) => {
  const snake = new Uint8Array(points.length * 2);
  for (let i = points.length; i--; ) {
    snake[i * 2 + 0] = points[i].x + 2;
    snake[i * 2 + 1] = points[i].y + 2;
  }
  return snake as Snake;
};

/**
 * Post-process the chain so the snake grows each time it eats a colored cell.
 *
 * The solver produces a chain of fixed-length snake states. This function
 * reconstructs each state from the head path so that the snake body tracks
 * the head's history. Each eating event increases the snake's length by one
 * segment, keeping the old tail that would otherwise have been dropped.
 */
export const applyGrowthToChain = (grid: Grid, chain: Snake[]): Snake[] => {
  if (chain.length === 0) return [];

  const gridCopy = copyGrid(grid);
  const baseLen = getSnakeLength(chain[0]);

  // initial snake cells (pre-history positions for segments whose history
  // predates the chain)
  const initialCells = snakeToCells(chain[0]);

  // Collect head positions and count eating events
  const headPositions: Point[] = [];
  const eatCountAtStep: number[] = [];
  let eatenSoFar = 0;

  for (let i = 0; i < chain.length; i++) {
    const snake = chain[i];
    const x = getHeadX(snake);
    const y = getHeadY(snake);
    headPositions.push({ x, y });

    if (isInside(gridCopy, x, y) && !isEmpty(getColor(gridCopy, x, y))) {
      setColorEmpty(gridCopy, x, y);
      eatenSoFar++;
    }
    eatCountAtStep.push(eatenSoFar);
  }

  // Reconstruct chain with growing snakes.
  // Segment i at time t = headPosition[t - i] when t >= i,
  // otherwise falls back to the initial snake cell at index (i - t).
  const result: Snake[] = [];
  for (let t = 0; t < chain.length; t++) {
    const totalLen = baseLen + eatCountAtStep[t];
    const cells: Point[] = [];

    for (let seg = 0; seg < totalLen; seg++) {
      const historyStep = t - seg;
      if (historyStep >= 0) {
        cells.push(headPositions[historyStep]);
      } else {
        const initialIdx = seg - t;
        cells.push(
          initialIdx < initialCells.length
            ? initialCells[initialIdx]
            : initialCells[initialCells.length - 1],
        );
      }
    }

    result.push(createSnakeFromCells(cells));
  }

  return result;
};
