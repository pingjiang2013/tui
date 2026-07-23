import unittest

from sokoban import LEVELS, Sokoban


class SokobanTests(unittest.TestCase):
    def test_all_builtin_levels_are_valid(self) -> None:
        games = [Sokoban(level) for level in LEVELS]
        self.assertTrue(all(game.boxes for game in games))

    def test_normal_move_and_wall_collision(self) -> None:
        game = Sokoban(
            """
            #####
            # @ #
            # $.#
            #####
            """
        )
        self.assertTrue(game.move("left"))
        self.assertEqual(game.player, (1, 1))
        self.assertEqual(game.moves, 1)
        self.assertFalse(game.move("left"))
        self.assertEqual(game.moves, 1)

    def test_push_box_onto_goal_and_win(self) -> None:
        game = Sokoban(
            """
            #####
            #@$.#
            #####
            """
        )
        self.assertTrue(game.move("right"))
        self.assertEqual(game.boxes, {(1, 3)})
        self.assertEqual(game.moves, 1)
        self.assertEqual(game.pushes, 1)
        self.assertTrue(game.won)
        self.assertIn("*", game.render())

    def test_cannot_push_box_into_wall(self) -> None:
        game = Sokoban(
            """
            ######
            ##$@ #
            #  . #
            ######
            """
        )
        self.assertFalse(game.move("left"))
        self.assertEqual(game.player, (1, 3))
        self.assertEqual(game.pushes, 0)

    def test_cannot_push_two_boxes(self) -> None:
        game = Sokoban(
            """
            #######
            #@$$..#
            #######
            """
        )
        self.assertFalse(game.move("right"))
        self.assertEqual(game.moves, 0)

    def test_undo_restores_player_box_and_counters(self) -> None:
        game = Sokoban(
            """
            #####
            #@$.#
            #####
            """
        )
        game.move("right")
        self.assertTrue(game.undo())
        self.assertEqual(game.player, (1, 1))
        self.assertEqual(game.boxes, {(1, 2)})
        self.assertEqual((game.moves, game.pushes), (0, 0))
        self.assertFalse(game.undo())

    def test_reset_clears_progress_and_history(self) -> None:
        game = Sokoban(
            """
            ######
            #@ $.#
            ######
            """
        )
        game.move("right")
        game.move("right")
        game.reset()
        self.assertEqual(game.player, (1, 1))
        self.assertEqual(game.boxes, {(1, 3)})
        self.assertEqual((game.moves, game.pushes), (0, 0))
        self.assertFalse(game.undo())

    def test_goal_under_player_is_rendered(self) -> None:
        game = Sokoban(
            """
            #####
            #+ $#
            #  *#
            #####
            """
        )
        self.assertIn("+", game.render())

    def test_invalid_level_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "箱子数量"):
            Sokoban(
                """
                #####
                #@$.#
                # . #
                #####
                """
            )


if __name__ == "__main__":
    unittest.main()

