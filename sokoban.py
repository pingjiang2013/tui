"""A small terminal Sokoban game for Windows.

Run with:
    conda run -n py311 python sokoban.py
"""

# 说明

from __future__ import annotations

import os
import sys
import textwrap
from dataclasses import dataclass


Point = tuple[int, int]

LEVELS = [
    """
    #######
    #     #
    # . $@#
    #     #
    #######
    """,
    """
    ########
    #      #
    # . $  #
    # . $@ #
    #      #
    ########
    """,
    """
    #########
    #   #   #
    # .   $ #
    # . # $@#
    #       #
    #########
    """,
    """
    ##########
    #        #
    #  ..    #
    #  $$    #
    #   @    #
    #        #
    ##########
    """,
]

DIRECTIONS: dict[str, Point] = {
    "up": (-1, 0),
    "down": (1, 0),
    "left": (0, -1),
    "right": (0, 1),
}

ALLOWED_TILES = {"#", " ", ".", "$", "*", "@", "+"}


@dataclass(frozen=True)
class Snapshot:
    player: Point
    boxes: frozenset[Point]
    moves: int
    pushes: int


class Sokoban:
    """The testable game-state and movement rules for one Sokoban level."""

    def __init__(self, level: str) -> None:
        rows = textwrap.dedent(level).strip("\n").splitlines()
        if not rows:
            raise ValueError("关卡不能为空")

        self.height = len(rows)
        self.width = max(len(row) for row in rows)
        rows = [row.ljust(self.width) for row in rows]

        self.walls: set[Point] = set()
        self.goals: set[Point] = set()
        boxes: set[Point] = set()
        players: list[Point] = []

        for row_index, row in enumerate(rows):
            for column_index, tile in enumerate(row):
                point = (row_index, column_index)
                if tile not in ALLOWED_TILES:
                    raise ValueError(f"未知地图字符 {tile!r}，位置为 {point}")
                if tile == "#":
                    self.walls.add(point)
                if tile in {".", "*", "+"}:
                    self.goals.add(point)
                if tile in {"$", "*"}:
                    boxes.add(point)
                if tile in {"@", "+"}:
                    players.append(point)

        if len(players) != 1:
            raise ValueError("每关必须且只能有一个玩家")
        if not boxes:
            raise ValueError("每关至少需要一个箱子")
        if len(boxes) != len(self.goals):
            raise ValueError("箱子数量必须与目标点数量相同")

        self.initial_player = players[0]
        self.initial_boxes = frozenset(boxes)
        self.player = self.initial_player
        self.boxes = set(self.initial_boxes)
        self.moves = 0
        self.pushes = 0
        self._history: list[Snapshot] = []

    def _snapshot(self) -> Snapshot:
        return Snapshot(self.player, frozenset(self.boxes), self.moves, self.pushes)

    def move(self, direction: str) -> bool:
        """Attempt a move. Return True only when the player actually moves."""
        if direction not in DIRECTIONS:
            raise ValueError(f"未知方向：{direction}")

        row_delta, column_delta = DIRECTIONS[direction]
        destination = (
            self.player[0] + row_delta,
            self.player[1] + column_delta,
        )
        if destination in self.walls:
            return False

        pushed_box_to: Point | None = None
        if destination in self.boxes:
            pushed_box_to = (
                destination[0] + row_delta,
                destination[1] + column_delta,
            )
            if pushed_box_to in self.walls or pushed_box_to in self.boxes:
                return False

        self._history.append(self._snapshot())
        if pushed_box_to is not None:
            self.boxes.remove(destination)
            self.boxes.add(pushed_box_to)
            self.pushes += 1
        self.player = destination
        self.moves += 1
        return True

    def undo(self) -> bool:
        """Undo one successful move, returning False if history is empty."""
        if not self._history:
            return False
        snapshot = self._history.pop()
        self.player = snapshot.player
        self.boxes = set(snapshot.boxes)
        self.moves = snapshot.moves
        self.pushes = snapshot.pushes
        return True

    def reset(self) -> None:
        self.player = self.initial_player
        self.boxes = set(self.initial_boxes)
        self.moves = 0
        self.pushes = 0
        self._history.clear()

    @property
    def won(self) -> bool:
        return self.boxes == self.goals

    def render(self) -> str:
        lines: list[str] = []
        for row in range(self.height):
            characters: list[str] = []
            for column in range(self.width):
                point = (row, column)
                if point in self.walls:
                    tile = "#"
                elif point == self.player:
                    tile = "+" if point in self.goals else "@"
                elif point in self.boxes:
                    tile = "*" if point in self.goals else "$"
                elif point in self.goals:
                    tile = "."
                else:
                    tile = " "
                characters.append(tile)
            lines.append("".join(characters).rstrip())
        return "\n".join(lines)


def read_key() -> str:
    """Read one key immediately from a Windows console."""
    try:
        import msvcrt
    except ImportError as error:
        raise RuntimeError("这个版本需要在 Windows 终端中运行") from error

    key = msvcrt.getwch()
    if key in {"\x00", "\xe0"}:
        arrow = msvcrt.getwch()
        return {"H": "up", "P": "down", "K": "left", "M": "right"}.get(
            arrow, "unknown"
        )
    return {
        "w": "up",
        "s": "down",
        "a": "left",
        "d": "right",
        "u": "undo",
        "r": "reset",
        "n": "next",
        "p": "previous",
        "q": "quit",
    }.get(key.lower(), "unknown")


def draw(game: Sokoban, level_index: int, message: str = "") -> None:
    status = (
        f"推箱子  关卡 {level_index + 1}/{len(LEVELS)}  "
        f"移动 {game.moves}  推动 {game.pushes}"
    )
    help_line = "方向键/WASD 移动 | U 撤销 | R 重开 | N/P 选关 | Q 退出"
    screen = f"\x1b[H\x1b[2J{status}\n\n{game.render()}\n\n{help_line}"
    if message:
        screen += f"\n{message}"
    print(screen, end="", flush=True)


def main() -> None:
    if os.name != "nt":
        print("这个版本需要在 Windows 终端中运行。")
        return

    # Enables ANSI processing in modern Windows consoles.
    os.system("")
    level_index = 0
    game = Sokoban(LEVELS[level_index])
    print("\x1b[?25l", end="", flush=True)
    try:
        while True:
            draw(game, level_index)
            action = read_key()

            if action == "quit":
                break
            if action in DIRECTIONS:
                game.move(action)
            elif action == "undo":
                game.undo()
            elif action == "reset":
                game.reset()
            elif action in {"next", "previous"}:
                step = 1 if action == "next" else -1
                level_index = (level_index + step) % len(LEVELS)
                game = Sokoban(LEVELS[level_index])

            if game.won:
                if level_index == len(LEVELS) - 1:
                    draw(game, level_index, "全部通关！按任意键返回第一关。")
                    read_key()
                    level_index = 0
                else:
                    draw(game, level_index, "通关！按任意键进入下一关。")
                    read_key()
                    level_index += 1
                game = Sokoban(LEVELS[level_index])
    except KeyboardInterrupt:
        pass
    finally:
        print("\x1b[?25h\x1b[H\x1b[2J", end="", flush=True)
        print("游戏已退出。")


if __name__ == "__main__":
    main()
