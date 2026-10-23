#include <algorithm>
#include <cstdlib>
#include <iostream>
#include <numeric>
#include <vector>

// Baseline: take the 50 orders whose restaurant and destination are closest to
// the office, visit all their restaurants in nearest-neighbour order, then all
// their destinations in nearest-neighbour order, and return to the office.

constexpr int ORDERS = 1000;
constexpr int CHOSEN = 50;
constexpr int OFFICE = 400;

struct Point {
    int x, y;
};

int dist(const Point& p, const Point& q) { return std::abs(p.x - q.x) + std::abs(p.y - q.y); }

// Visit every point once, always going to the nearest one left; appends them to route.
void nearest_neighbour(std::vector<Point> points, std::vector<Point>& route) {
    while (!points.empty()) {
        const Point& here = route.back();
        size_t next = 0;
        for (size_t k = 1; k < points.size(); k++) {
            if (dist(here, points[k]) < dist(here, points[next])) next = k;
        }
        route.push_back(points[next]);
        points.erase(points.begin() + next);
    }
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    const Point office{OFFICE, OFFICE};
    std::vector<Point> from(ORDERS), to(ORDERS);
    for (int i = 0; i < ORDERS; i++) std::cin >> from[i].x >> from[i].y >> to[i].x >> to[i].y;

    std::vector<int> order(ORDERS);
    std::iota(order.begin(), order.end(), 0);
    std::sort(order.begin(), order.end(), [&](int p, int q) {
        return dist(office, from[p]) + dist(office, to[p]) < dist(office, from[q]) + dist(office, to[q]);
    });
    order.resize(CHOSEN);

    std::vector<Point> pickups, deliveries;
    for (int i : order) {
        pickups.push_back(from[i]);
        deliveries.push_back(to[i]);
    }
    std::vector<Point> route{office};
    nearest_neighbour(pickups, route);
    nearest_neighbour(deliveries, route);
    route.push_back(office);

    std::cout << CHOSEN;
    for (int i : order) std::cout << ' ' << i + 1;
    std::cout << '\n' << route.size();
    for (const Point& p : route) std::cout << ' ' << p.x << ' ' << p.y;
    std::cout << '\n';
    return 0;
}
