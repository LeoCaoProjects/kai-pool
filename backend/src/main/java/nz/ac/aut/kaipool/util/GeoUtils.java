package nz.ac.aut.kaipool.util;

public final class GeoUtils {

    private static final double EARTH_RADIUS_KM = 6371.0;

    private GeoUtils() {
    }

    public static double distanceKm(double latitudeA, double longitudeA, double latitudeB, double longitudeB) {
        double latitudeDistance = Math.toRadians(latitudeB - latitudeA);
        double longitudeDistance = Math.toRadians(longitudeB - longitudeA);
        double value = Math.sin(latitudeDistance / 2) * Math.sin(latitudeDistance / 2)
                + Math.cos(Math.toRadians(latitudeA)) * Math.cos(Math.toRadians(latitudeB))
                        * Math.sin(longitudeDistance / 2) * Math.sin(longitudeDistance / 2);
        return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
    }
}
