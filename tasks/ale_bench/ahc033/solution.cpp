#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

// Baseline: the four small cranes are bombed on the first turn and the large
// crane does all the work, simulated turn by turn:
// 1. if the next container of some Dispatch Gate is on the grid, carry the
//    nearest such container to its gate;
// 2. otherwise, move a container from a Receiving Gate that still has
//    containers to come into the nearest free storage square;
// 3. otherwise (storage full), carry the container that causes the fewest
//    inversions to its own Dispatch Gate, out of order.

constexpr int N = 5;

int A[N][N];
int arrived[N];         // containers already brought in at each Receiving Gate
int grid[N][N];         // container number, or -1
bool dispatched[N * N];
int dispatched_count = 0;
int ci = 0, cj = 0;     // large crane position
int holding = -1;
std::string actions;

int next_needed(int row) {
    for (int b = N * row; b < N * (row + 1); b++) {
        if (!dispatched[b]) return b;
    }
    return -1;
}

void turn(char action) {
    for (int i = 0; i < N; i++) {
        if (arrived[i] < N && grid[i][0] == -1 && !(ci == i && cj == 0 && holding != -1)) {
            grid[i][0] = A[i][arrived[i]++];
        }
    }
    if (action == 'U') ci--;
    if (action == 'D') ci++;
    if (action == 'L') cj--;
    if (action == 'R') cj++;
    if (action == 'P') {
        holding = grid[ci][cj];
        grid[ci][cj] = -1;
    }
    if (action == 'Q') {
        grid[ci][cj] = holding;
        holding = -1;
    }
    for (int i = 0; i < N; i++) {
        if (grid[i][N - 1] != -1) {
            dispatched[grid[i][N - 1]] = true;
            dispatched_count++;
            grid[i][N - 1] = -1;
        }
    }
    actions += action;
}

void move_to(int ti, int tj) {
    while (ci != ti) turn(ci < ti ? 'D' : 'U');
    while (cj != tj) turn(cj < tj ? 'R' : 'L');
}

int dist(int i1, int j1, int i2, int j2) { return std::abs(i1 - i2) + std::abs(j1 - j2); }

void carry(int fi, int fj, int ti, int tj) {
    move_to(fi, fj);
    turn('P');
    move_to(ti, tj);
    turn('Q');
}

int main() {
    int n;
    std::cin >> n;
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            std::cin >> A[i][j];
            grid[i][j] = -1;
        }
    }

    turn('.');  // the small cranes bomb themselves on this turn
    while (dispatched_count < N * N) {
        // 1. A container that is next for its Dispatch Gate.
        int best_i = -1, best_j = -1, best_cost = 1 << 30;
        for (int i = 0; i < N; i++) {
            for (int j = 0; j < N - 1; j++) {
                int c = grid[i][j];
                if (c == -1 || c != next_needed(c / N)) continue;
                int cost = dist(ci, cj, i, j) + dist(i, j, c / N, N - 1);
                if (cost < best_cost) {
                    best_cost = cost;
                    best_i = i;
                    best_j = j;
                }
            }
        }
        if (best_i != -1) {
            carry(best_i, best_j, grid[best_i][best_j] / N, N - 1);
            continue;
        }

        // 2. Make room at a Receiving Gate that still has containers to come.
        int gate = -1;
        for (int i = 0; i < N; i++) {
            if (grid[i][0] != -1 && arrived[i] < N && (gate == -1 || dist(ci, cj, i, 0) < dist(ci, cj, gate, 0))) gate = i;
        }
        int si = -1, sj = -1;
        if (gate != -1) {
            for (int i = 0; i < N; i++) {
                for (int j = 1; j < N - 1; j++) {
                    if (grid[i][j] == -1 && (si == -1 || dist(gate, 0, i, j) < dist(gate, 0, si, sj))) {
                        si = i;
                        sj = j;
                    }
                }
            }
        }
        if (gate != -1 && si != -1) {
            carry(gate, 0, si, sj);
            continue;
        }

        // 3. Dispatch out of order the container that adds the fewest inversions.
        int fewest = 1 << 30;
        for (int i = 0; i < N; i++) {
            for (int j = 0; j < N - 1; j++) {
                int c = grid[i][j];
                if (c == -1) continue;
                int inversions = 0;
                for (int b = N * (c / N); b < c; b++) inversions += dispatched[b] ? 0 : 1;
                if (inversions < fewest) {
                    fewest = inversions;
                    best_i = i;
                    best_j = j;
                }
            }
        }
        if (best_i != -1) {
            carry(best_i, best_j, grid[best_i][best_j] / N, N - 1);
        } else {
            turn('.');  // nothing on the grid yet: wait for the Receiving Gates
        }
    }

    std::cout << actions << '\n';
    for (int i = 1; i < N; i++) std::cout << "B\n";
    return 0;
}
