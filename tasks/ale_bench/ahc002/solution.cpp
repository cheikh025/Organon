#include <iostream>
#include <string>
#include <vector>

// Baseline: a greedy walk. At each step, move to the neighbouring square whose
// tile has not been stepped on, preferring squares with more onward moves and
// then a higher value; stop when no such square is left.

constexpr int N = 50;
const int DI[4] = {-1, 1, 0, 0};
const int DJ[4] = {0, 0, -1, 1};
const char DIR[4] = {'U', 'D', 'L', 'R'};

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int si, sj;
    std::cin >> si >> sj;
    std::vector<std::vector<int>> tile(N, std::vector<int>(N)), value(N, std::vector<int>(N));
    int tiles = 0;
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            std::cin >> tile[i][j];
            tiles = std::max(tiles, tile[i][j] + 1);
        }
    }
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) std::cin >> value[i][j];
    }

    std::vector<bool> used(tiles, false);
    auto free_square = [&](int i, int j) {
        return i >= 0 && i < N && j >= 0 && j < N && !used[tile[i][j]];
    };
    // Onward moves from (i, j) once its tile is taken.
    auto onward = [&](int i, int j) {
        int count = 0;
        for (int d = 0; d < 4; d++) {
            int ni = i + DI[d], nj = j + DJ[d];
            if (free_square(ni, nj) && tile[ni][nj] != tile[i][j]) count++;
        }
        return count;
    };

    std::string path;
    int i = si, j = sj;
    used[tile[i][j]] = true;
    while (true) {
        int best = -1, best_onward = -1, best_value = -1;
        for (int d = 0; d < 4; d++) {
            int ni = i + DI[d], nj = j + DJ[d];
            if (!free_square(ni, nj)) continue;
            int o = onward(ni, nj);
            if (o > best_onward || (o == best_onward && value[ni][nj] > best_value)) {
                best = d;
                best_onward = o;
                best_value = value[ni][nj];
            }
        }
        if (best == -1) break;
        i += DI[best];
        j += DJ[best];
        used[tile[i][j]] = true;
        path += DIR[best];
    }

    std::cout << path << '\n';
    return 0;
}
