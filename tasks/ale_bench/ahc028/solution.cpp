#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

// Baseline: build the lucky string by appending the words one at a time, each
// time choosing the word that overlaps most with the end of the string so far,
// then type it by pressing, for each letter, the nearest key with that letter.

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int n, m;
    std::cin >> n >> m;
    int si, sj;
    std::cin >> si >> sj;
    std::vector<std::string> grid(n);
    for (auto& row : grid) std::cin >> row;
    std::vector<std::string> words(m);
    for (auto& word : words) std::cin >> word;

    // Longest suffix of s that is a prefix of word.
    auto overlap = [](const std::string& s, const std::string& word) {
        for (int len = std::min(s.size(), word.size()); len > 0; len--) {
            if (s.compare(s.size() - len, len, word, 0, len) == 0) return len;
        }
        return 0;
    };

    std::string s;
    std::vector<bool> done(m, false);
    for (int step = 0; step < m; step++) {
        int best = -1, best_overlap = -1;
        for (int k = 0; k < m; k++) {
            if (done[k]) continue;
            if (s.find(words[k]) != std::string::npos) {
                done[k] = true;
                continue;
            }
            int o = overlap(s, words[k]);
            if (o > best_overlap) {
                best = k;
                best_overlap = o;
            }
        }
        if (best == -1) break;
        s += words[best].substr(best_overlap);
        done[best] = true;
    }

    int i = si, j = sj;
    for (char c : s) {
        int bi = -1, bj = -1, best_cost = 1 << 30;
        for (int r = 0; r < n; r++) {
            for (int q = 0; q < n; q++) {
                if (grid[r][q] != c) continue;
                int cost = std::abs(r - i) + std::abs(q - j);
                if (cost < best_cost) {
                    best_cost = cost;
                    bi = r;
                    bj = q;
                }
            }
        }
        i = bi;
        j = bj;
        std::cout << i << ' ' << j << '\n';
    }
    return 0;
}
