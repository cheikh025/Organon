// The official sample program of AHC074, ported from Python: sheet k shows barcode A_k fully, and
// each order for an item below K turns the top sheet to the bottom until the item's sheet is on
// top. Orders for items K..P-1 are left as errors.
#include <bits/stdc++.h>
using namespace std;

int main() {
    int N, K, P, R;
    cin >> N >> K >> P >> R;
    vector<string> patterns(P);
    for (auto& pattern : patterns) cin >> pattern;
    for (int k = 0; k < K; k++) cout << patterns[k] << '\n';
    cout << flush;

    int top = 0;
    for (int r = 0; r < R; r++) {
        int request;
        if (!(cin >> request) || request == -1) return 0;
        int count = request < K ? ((request - top) % K + K) % K : 0;
        cout << count << '\n';
        for (int i = 0; i < count; i++) {
            cout << top << ' ' << K - 1 << '\n';
            top = (top + 1) % K;
        }
        cout << flush;
    }
    return 0;
}
