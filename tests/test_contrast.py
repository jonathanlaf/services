import os
import re
import unittest

CSS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'style.css')
# Text on background pairs that must reach WCAG AA for body text (4.5:1)
PAIRS = [('--fg', '--bg'), ('--fg', '--surface'), ('--muted', '--bg'), ('--muted', '--surface'),
         ('--accent', '--bg'), ('--accent', '--surface'), ('--on-accent', '--accent')]


def block(css, selector):
    m = re.search(re.escape(selector) + r'\s*\{([^}]*)\}', css)
    return dict(re.findall(r'(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})', m.group(1))) if m else {}


def luminance(hex_colour):
    def ch(c):
        c = int(c, 16) / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(hex_colour[i:i + 2]) for i in (1, 3, 5))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


class Contrast(unittest.TestCase):
    def setUp(self):
        with open(CSS, encoding='utf-8') as f:
            self.css = f.read()

    def check(self, tokens, name):
        for fg, bg in PAIRS:
            with self.subTest(theme=name, pair=(fg, bg)):
                self.assertIn(fg, tokens); self.assertIn(bg, tokens)
                self.assertGreaterEqual(ratio(tokens[fg], tokens[bg]), 4.5)

    def test_light(self):
        self.check(block(self.css, ':root'), 'light')

    def test_dark(self):
        self.check(block(self.css, ':root[data-theme="dark"]'), 'dark')

    def test_dark_blocks_match(self):
        auto = block(self.css, ':root:not([data-theme="light"])')
        self.assertEqual(auto, block(self.css, ':root[data-theme="dark"]'))


if __name__ == '__main__':
    unittest.main()
