#include <algorithm>
#include <array>
#include <deque>
#include <iostream>
#include <string>
#include <vector>

// Baseline: no macros. For each ball in input order, drive the robot to the
// ball with the fewest operations (shortest path over position and facing,
// where F, R and L each cost one), pick it up with S, drive to its basket and
// put it down with S. The output is cut at T operations if it is longer.

const int DI[4] = {0, 1, 0, -1};  // right, down, left, up (clockwise)
const int DJ[4] = {1, 0, -1, 0};

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int n, m, t;
    std::cin >> n >> m >> t;
    std::vector<std::string> v(n), h(n - 1);
    for (auto& row : v) std::cin >> row;
    for (auto& row : h) std::cin >> row;
    std::vector<std::array<int, 4>> balls(m);
    for (auto& b : balls) std::cin >> b[0] >> b[1] >> b[2] >> b[3];

    auto can_move = [&](int i, int j, int d) {
        if (d == 0) return j < n - 1 && v[i][j] == '0';
        if (d == 1) return i < n - 1 && h[i][j] == '0';
        if (d == 2) return j > 0 && v[i][j - 1] == '0';
        return i > 0 && h[i - 1][j] == '0';
    };

    int ri = 0, rj = 0, rd = 0;  // robot position and facing (right)
    std::string ops;

    // Append the cheapest F/R/L sequence that takes the robot to (gi, gj).
    auto drive = [&](int gi, int gj) {
        const int states = n * n * 4;
        std::vector<int> dist(states, -1), prev(states, -1);
        std::vector<char> how(states, 0);
        auto id = [&](int i, int j, int d) { return (i * n + j) * 4 + d; };
        std::deque<int> frontier;
        int start = id(ri, rj, rd);
        dist[start] = 0;
        frontier.push_back(start);
        int goal = -1;
        while (!frontier.empty()) {
            int s = frontier.front();
            frontier.pop_front();
            int d = s % 4, cell = s / 4, i = cell / n, j = cell % n;
            if (i == gi && j == gj) {
                goal = s;
                break;
            }
            auto relax = [&](int next, char op) {
                if (dist[next] != -1) return;
                dist[next] = dist[s] + 1;
                prev[next] = s;
                how[next] = op;
                frontier.push_back(next);
            };
            if (can_move(i, j, d)) relax(id(i + DI[d], j + DJ[d], d), 'F');
            relax(id(i, j, (d + 1) % 4), 'R');
            relax(id(i, j, (d + 3) % 4), 'L');
        }
        std::string path;
        for (int s = goal; s != start; s = prev[s]) path += how[s];
        std::reverse(path.begin(), path.end());
        ops += path;
        ri = gi;
        rj = gj;
        rd = goal % 4;
    };

    for (const auto& b : balls) {
        drive(b[0], b[1]);
        ops += 'S';
        drive(b[2], b[3]);
        ops += 'S';
    }

    if (static_cast<int>(ops.size()) > t) ops.resize(t);
    for (char op : ops) std::cout << op << '\n';
    return 0;
}
