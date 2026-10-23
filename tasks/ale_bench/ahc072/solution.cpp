#include <algorithm>
#include <iostream>
#include <queue>
#include <string>
#include <tuple>
#include <vector>

// Baseline: send the slimes home one at a time, nearest to its nest first.
// The slime being moved is always alone or on top of its cell, so it jumps
// alone (leaving k = height - 1 behind) one cell at a time along a shortest
// floor path to its nest, where it returns home. Towers never grow above two.
// Output stops at the operation limit.

constexpr int MAX_OPS = 100000;
const int DI[4] = {-1, 1, 0, 0};
const int DJ[4] = {0, 0, -1, 1};
const char DIR[4] = {'U', 'D', 'L', 'R'};

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int n, k;
    std::cin >> n >> k;
    std::vector<std::string> grid(n);
    for (auto& row : grid) std::cin >> row;

    std::vector<int> nest(k);
    std::vector<std::pair<int, int>> slimes;  // (cell, colour)
    std::vector<int> height(n * n, 0);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            char c = grid[i][j];
            if (c >= 'A' && c <= 'L') nest[c - 'A'] = i * n + j;
            if (c >= 'a' && c <= 'l') {
                slimes.push_back({i * n + j, c - 'a'});
                height[i * n + j] = 1;
            }
        }
    }

    // First move of a shortest floor path from each cell to `goal`, by breadth-first search from the goal.
    auto toward = [&](int goal) {
        std::vector<int> step(n * n, -1), dist(n * n, -1);
        std::queue<int> frontier;
        dist[goal] = 0;
        frontier.push(goal);
        while (!frontier.empty()) {
            int cell = frontier.front();
            frontier.pop();
            int i = cell / n, j = cell % n;
            for (int d = 0; d < 4; d++) {
                int ni = i + DI[d], nj = j + DJ[d];
                if (ni < 0 || ni >= n || nj < 0 || nj >= n || grid[ni][nj] == '#') continue;
                int next = ni * n + nj;
                if (dist[next] != -1) continue;
                dist[next] = dist[cell] + 1;
                step[next] = d ^ 1;  // from `next`, move back toward `cell`
                frontier.push(next);
            }
        }
        return std::make_pair(step, dist);
    };

    std::vector<std::vector<int>> step(k), dist(k);
    for (int c = 0; c < k; c++) std::tie(step[c], dist[c]) = toward(nest[c]);
    std::sort(slimes.begin(), slimes.end(), [&](const auto& a, const auto& b) {
        return dist[a.second][a.first] < dist[b.second][b.first];
    });

    int ops = 0;
    std::string out;
    for (auto [cell, colour] : slimes) {
        int remaining = dist[colour][cell];
        if (ops + remaining > MAX_OPS) break;
        while (cell != nest[colour]) {
            int d = step[colour][cell];
            out += std::to_string(cell / n) + ' ' + std::to_string(cell % n) + ' ' + std::to_string(height[cell] - 1)
                   + ' ' + DIR[d] + " 1\n";
            height[cell]--;
            cell = (cell / n + DI[d]) * n + (cell % n + DJ[d]);
            height[cell]++;
            ops++;
        }
        height[cell]--;  // it returns home on its nest
    }
    std::cout << out;
    return 0;
}
