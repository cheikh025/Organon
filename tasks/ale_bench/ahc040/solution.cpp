#include <algorithm>
#include <cmath>
#include <iostream>
#include <vector>

// Baseline: shelf packing. Every rectangle is placed, turned so that it is
// wider than tall, left to right in rows: each one goes `L` with, as its
// reference, the tallest rectangle of the row above, so it lands just under
// that row and slides left until it meets the previous rectangle of its row.
// A row ends when it would pass the target width. Each turn tries a different
// target width, from 0.7 to 1.7 times the square root of the total area; the
// score keeps the best turn.

int main() {
    int n, t, sigma;
    std::cin >> n >> t >> sigma;
    std::vector<long long> w(n), h(n);
    for (int i = 0; i < n; i++) std::cin >> w[i] >> h[i];

    double area = 0;
    for (int i = 0; i < n; i++) area += double(w[i]) * double(h[i]);

    for (int turn = 0; turn < t; turn++) {
        double factor = t == 1 ? 1.0 : 0.7 + 1.0 * turn / (t - 1);
        double target = factor * std::sqrt(area);

        std::cout << n << '\n';
        int above = -1;                   // tallest rectangle of the previous row
        int tallest = -1;                 // tallest rectangle of the current row
        long long row_width = 0, tallest_height = 0;
        for (int i = 0; i < n; i++) {
            int r = w[i] < h[i] ? 1 : 0;  // turn it so that it is wider than tall
            long long width = r ? h[i] : w[i];
            long long height = r ? w[i] : h[i];
            if (row_width > 0 && row_width + width > target) {
                above = tallest;
                tallest = -1;
                row_width = 0;
                tallest_height = 0;
            }
            std::cout << i << ' ' << r << " L " << above << '\n';
            row_width += width;
            if (tallest == -1 || height > tallest_height) {
                tallest = i;
                tallest_height = height;
            }
        }
        std::cout << std::flush;

        long long measured_w, measured_h;
        std::cin >> measured_w >> measured_h;
    }
    return 0;
}
