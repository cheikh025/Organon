#include <algorithm>
#include <iostream>
#include <numeric>
#include <queue>
#include <vector>

// Baseline: repeatedly take the unassigned vertex with the lowest beauty as a
// root and grow its tree breadth-first over unassigned vertices, up to height H.

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int n, m, h;
    std::cin >> n >> m >> h;
    std::vector<int> beauty(n);
    for (auto& a : beauty) std::cin >> a;
    std::vector<std::vector<int>> adj(n);
    for (int e = 0; e < m; e++) {
        int u, v;
        std::cin >> u >> v;
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    // Coordinates are not used by this baseline.
    for (int v = 0; v < n; v++) {
        int x, y;
        std::cin >> x >> y;
    }

    std::vector<int> order(n);
    std::iota(order.begin(), order.end(), 0);
    std::sort(order.begin(), order.end(), [&](int p, int q) { return beauty[p] < beauty[q]; });

    std::vector<int> parent(n, -1), height(n, -1);
    for (int root : order) {
        if (height[root] != -1) continue;
        height[root] = 0;
        std::queue<int> frontier;
        frontier.push(root);
        while (!frontier.empty()) {
            int v = frontier.front();
            frontier.pop();
            if (height[v] == h) continue;
            for (int w : adj[v]) {
                if (height[w] != -1) continue;
                height[w] = height[v] + 1;
                parent[w] = v;
                frontier.push(w);
            }
        }
    }

    for (int v = 0; v < n; v++) std::cout << parent[v] << (v + 1 < n ? ' ' : '\n');
    return 0;
}
