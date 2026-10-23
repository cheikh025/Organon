#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>

// Baseline: one colour, and one internal state per step. The robot follows the
// concatenation of the shortest paths between consecutive destinations; at
// step t it is in state t and moves in the t-th direction of that path, so
// every (colour, state) pair is used once. The last state has no rule, which
// stops the robot after the last destination.

const int DI[4] = {-1, 1, 0, 0};
const int DJ[4] = {0, 0, -1, 1};
const char DIR[4] = {'U', 'D', 'L', 'R'};

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int n, k, t;
    std::cin >> n >> k >> t;
    std::vector<std::string> v(n), h(n - 1);
    for (auto& row : v) std::cin >> row;
    for (auto& row : h) std::cin >> row;
    std::vector<std::pair<int, int>> dest(k);
    for (auto& [x, y] : dest) std::cin >> x >> y;

    auto can_move = [&](int i, int j, int d) {
        if (d == 0) return i > 0 && h[i - 1][j] == '0';
        if (d == 1) return i < n - 1 && h[i][j] == '0';
        if (d == 2) return j > 0 && v[i][j - 1] == '0';
        return j < n - 1 && v[i][j] == '0';
    };

    // Directions of the shortest path from (si, sj) to (gi, gj), by breadth-first search.
    auto shortest = [&](int si, int sj, int gi, int gj) {
        std::vector<int> from(n * n, -1);
        std::queue<int> frontier;
        from[si * n + sj] = 4;
        frontier.push(si * n + sj);
        while (!frontier.empty()) {
            int cell = frontier.front();
            frontier.pop();
            if (cell == gi * n + gj) break;
            int i = cell / n, j = cell % n;
            for (int d = 0; d < 4; d++) {
                if (!can_move(i, j, d)) continue;
                int next = (i + DI[d]) * n + (j + DJ[d]);
                if (from[next] != -1) continue;
                from[next] = d;
                frontier.push(next);
            }
        }
        std::string path;
        for (int cell = gi * n + gj; cell != si * n + sj;) {
            int d = from[cell];
            path += DIR[d];
            cell = (cell / n - DI[d]) * n + (cell % n - DJ[d]);
        }
        return std::string(path.rbegin(), path.rend());
    };

    std::string moves;
    for (int d = 0; d + 1 < k; d++) {
        moves += shortest(dest[d].first, dest[d].second, dest[d + 1].first, dest[d + 1].second);
    }

    int steps = static_cast<int>(moves.size());
    std::cout << 1 << ' ' << steps + 1 << ' ' << steps << '\n';
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) std::cout << 0 << (j + 1 < n ? ' ' : '\n');
    }
    for (int s = 0; s < steps; s++) std::cout << "0 " << s << " 0 " << s + 1 << ' ' << moves[s] << '\n';
    return 0;
}
