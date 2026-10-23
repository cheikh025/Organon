#include <algorithm>
#include <chrono>
#include <cstdint>
#include <iostream>
#include <numeric>
#include <random>
#include <vector>

// Baseline: each company starts with the 1x1 cell at its point, then rectangles
// grow greedily, one side at a time, while they stay inside the board, do not
// overlap any other rectangle and do not exceed the requested area.

constexpr int SIZE = 10000;
constexpr double TIME_LIMIT_SEC = 4.0;

struct Rect {
    int a, b, c, d;  // [a, c) x [b, d)
    int64_t area() const { return int64_t(c - a) * (d - b); }
};

bool overlaps(const Rect& p, const Rect& q) {
    return std::max(p.a, q.a) < std::min(p.c, q.c) && std::max(p.b, q.b) < std::min(p.d, q.d);
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    const auto start = std::chrono::steady_clock::now();
    auto elapsed = [&]() {
        return std::chrono::duration<double>(std::chrono::steady_clock::now() - start).count();
    };

    int n;
    std::cin >> n;
    std::vector<int> x(n), y(n);
    std::vector<int64_t> r(n);
    for (int i = 0; i < n; i++) std::cin >> x[i] >> y[i] >> r[i];

    std::vector<Rect> rects(n);
    for (int i = 0; i < n; i++) rects[i] = {x[i], y[i], x[i] + 1, y[i] + 1};

    auto fits = [&](int i, const Rect& candidate) {
        if (candidate.a < 0 || candidate.b < 0 || candidate.c > SIZE || candidate.d > SIZE) return false;
        if (candidate.area() > r[i]) return false;
        for (int j = 0; j < n; j++) {
            if (j != i && overlaps(candidate, rects[j])) return false;
        }
        return true;
    };

    std::mt19937 rng(12345);
    std::vector<int> order(n);
    std::iota(order.begin(), order.end(), 0);
    bool changed = true;
    while (changed && elapsed() < TIME_LIMIT_SEC) {
        changed = false;
        std::shuffle(order.begin(), order.end(), rng);
        for (int i : order) {
            for (int side = 0; side < 4; side++) {
                // Take the largest step that fits, halving it down to 1.
                for (int step = 1024; step >= 1; step /= 2) {
                    Rect candidate = rects[i];
                    if (side == 0) candidate.a -= step;
                    if (side == 1) candidate.b -= step;
                    if (side == 2) candidate.c += step;
                    if (side == 3) candidate.d += step;
                    if (fits(i, candidate)) {
                        rects[i] = candidate;
                        changed = true;
                        break;
                    }
                }
            }
        }
    }

    for (const Rect& rect : rects) {
        std::cout << rect.a << ' ' << rect.b << ' ' << rect.c << ' ' << rect.d << '\n';
    }
    return 0;
}
