#include <cmath>
#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>

// Baseline: no moves. Each arriving group is accepted if a free region can be
// found: first the most compact one, a block ceil(sqrt(P)) cells wide filled
// row by row, tried at every position; otherwise P cells collected by
// breadth-first search from the first free lawn cell found that has enough
// free lawn around it. Groups that fit nowhere are rejected.

int main() {
    int n, m;
    std::string r;
    std::cin >> n >> m >> r;
    std::vector<std::string> grid(n);
    for (auto& row : grid) std::cin >> row;

    std::vector<std::vector<int>> owner(n, std::vector<int>(n, -1));
    std::vector<int> departs(m, -1);
    std::vector<std::vector<std::pair<int, int>>> regions(m);

    auto free_cell = [&](int x, int y) {
        return x >= 0 && x < n && y >= 0 && y < n && grid[x][y] == '.' && owner[x][y] == -1;
    };

    // P cells filling a block `width` wide from (x, y), row by row; empty if one is not free.
    auto block = [&](int x, int y, int width, int p) {
        std::vector<std::pair<int, int>> cells;
        for (int c = 0; c < p; c++) {
            int cx = x + c / width, cy = y + c % width;
            if (!free_cell(cx, cy)) return std::vector<std::pair<int, int>>{};
            cells.push_back({cx, cy});
        }
        return cells;
    };

    // P free cells connected to (x, y), by breadth-first search; empty if there are fewer.
    auto flood = [&](int x, int y, int p) {
        std::vector<std::pair<int, int>> cells;
        std::vector<std::vector<bool>> seen(n, std::vector<bool>(n, false));
        std::queue<std::pair<int, int>> frontier;
        seen[x][y] = true;
        frontier.push({x, y});
        const int dx[4] = {-1, 1, 0, 0}, dy[4] = {0, 0, -1, 1};
        while (!frontier.empty() && static_cast<int>(cells.size()) < p) {
            auto [cx, cy] = frontier.front();
            frontier.pop();
            cells.push_back({cx, cy});
            for (int d = 0; d < 4; d++) {
                int nx = cx + dx[d], ny = cy + dy[d];
                if (free_cell(nx, ny) && !seen[nx][ny]) {
                    seen[nx][ny] = true;
                    frontier.push({nx, ny});
                }
            }
        }
        if (static_cast<int>(cells.size()) < p) cells.clear();
        return cells;
    };

    for (int g = 0; g < m; g++) {
        int id, s, t, p;
        long long value;
        std::cin >> id >> s >> t >> p >> value;

        for (int j = 0; j < g; j++) {
            if (departs[j] != -1 && departs[j] < s) {
                for (auto [x, y] : regions[j]) owner[x][y] = -1;
                departs[j] = -1;
            }
        }

        std::vector<std::pair<int, int>> cells;
        int width = static_cast<int>(std::ceil(std::sqrt(static_cast<double>(p))));
        for (int x = 0; x < n && cells.empty(); x++) {
            for (int y = 0; y < n && cells.empty(); y++) cells = block(x, y, width, p);
        }
        for (int x = 0; x < n && cells.empty(); x++) {
            for (int y = 0; y < n && cells.empty(); y++) {
                if (free_cell(x, y)) cells = flood(x, y, p);
            }
        }

        std::cout << 0 << '\n';
        if (cells.empty()) {
            std::cout << "No\n";
        } else {
            std::cout << "Yes\n";
            for (auto [x, y] : cells) {
                owner[x][y] = g;
                std::cout << x << ' ' << y << '\n';
            }
            regions[g] = cells;
            departs[g] = t;
        }
        std::cout << std::flush;
    }
    return 0;
}
