import pytest

from planner.geometry import Polyline, haversine_miles


def test_haversine_one_degree_of_latitude():
    assert haversine_miles((0, 0), (1, 0)) == pytest.approx(69.09, abs=0.05)


def test_point_at_interpolates_and_scales_to_road_distance():
    line = Polyline([(0, 0), (0, 1), (0, 2)], total_miles=200)
    assert line.length == pytest.approx(200)
    assert line.point_at(0) == (0, 0)
    assert line.point_at(100) == pytest.approx((0, 1))
    assert line.point_at(150) == pytest.approx((0, 1.5))
    assert line.point_at(500) == (0, 2)


def test_single_point_line():
    assert Polyline([(5, 5)]).point_at(10) == (5, 5)
