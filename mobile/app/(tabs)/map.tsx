import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Mapbox from "@rnmapbox/maps";
import * as Location from "expo-location";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";
import { AMapSdk, MapView as AMapView, Marker, Polyline } from "react-native-amap3d";
import * as eviltransform from "eviltransform/transform";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN || "");
AMapSdk.init(
  Platform.select({
    android: process.env.EXPO_PUBLIC_AMAP_ANDROID_API_KEY || "",
    ios: process.env.EXPO_PUBLIC_AMAP_IOS_API_KEY || "",
  })
);

const CHINA_BOUNDARY = polygon([
  [
    [73.66, 3.86],
    [135.05, 3.86],
    [135.05, 53.55],
    [73.66, 53.55],
    [73.66, 3.86],
  ],
]);

const BACKEND_BASE_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  (Platform.OS === "android" ? "http://10.0.2.2:5001" : "http://127.0.0.1:5001");

// Default stations for the train route if user doesn't specify in URL params.
const TRAIN_FROM_STATION = "北京";
const TRAIN_TO_STATION = "上海";

type LatLng = {
  latitude: number;
  longitude: number;
};

type RouteTrain = {
  train_code?: string;
  from_station?: { zh?: string; en?: string };
  to_station?: { zh?: string; en?: string };
};

type TransferOption = {
  legs?: RouteTrain[];
};

type RouteResponse = {
  trains?: RouteTrain[];
  options?: TransferOption[];
  from?: { zh?: string };
  to?: { zh?: string };
};

type StopsResponse = {
  stations?: { station_name?: string }[];
};

type TrainNoResponse = {
  success?: boolean;
  train_no?: string;
};

type TicketsTrain = {
  train_no?: string;
  from_station?: string;
  to_station?: string;
};

type TicketsResponse = {
  trains?: TicketsTrain[];
};

export default function Index() {
  const params = useLocalSearchParams<{ from?: string; to?: string; overview?: string }>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  const mapboxCameraRef = useRef<Mapbox.Camera>(null);
  const amapRef = useRef<any>(null);

  //track the previous state to detect Border Crossings
  const lastCountryState = useRef<boolean | null>(null);
  const hasInitialFix = useRef(false);
  const hasLoadedTrainRoute = useRef(false);
  const hasAppliedOverviewRef = useRef(false);
  const geocodeCacheRef = useRef<Record<string, LatLng | null>>({});

  const [trainPolyline, setTrainPolyline] = useState<LatLng[]>([]);
  const [trainMarkers, setTrainMarkers] = useState<LatLng[]>([]);
  const [amapLanguage, setAmapLanguage] = useState<"zh_cn" | "en">("zh_cn");
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeStationCount, setRouteStationCount] = useState(0);
  const [routePointCount, setRoutePointCount] = useState(0);

  // Trims off ", China" from current or destination station if user included it, and falls back to defaults if empty.
  const requestedFromStation = useMemo(() => {
    const from = typeof params.from === "string" ? params.from.trim() : "";
    return (from || TRAIN_FROM_STATION).replace(/,\s*China$/i, "").trim();
  }, [params.from]);

  const requestedToStation = useMemo(() => {
    const to = typeof params.to === "string" ? params.to.trim() : "";
    return (to || TRAIN_TO_STATION).replace(/,\s*China$/i, "").trim();
  }, [params.to]);

  const hasRouteParams = useMemo(() => {
    return Boolean(
      (typeof params.from === "string" && params.from.trim()) ||
        (typeof params.to === "string" && params.to.trim())
    );
  }, [params.from, params.to]);

  const shouldOpenRouteOverview = useMemo(() => {
    const value = typeof params.overview === "string" ? params.overview.toLowerCase() : "";
    return value === "1" || value === "true" || value === "yes";
  }, [params.overview]);

  useEffect(() => {
    let isMounted = true;
    let currentPosition: Location.LocationSubscription | null = null;

    const requestLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted) return;

      const granted = status === "granted";
      setHasPermission(granted);

      if (!granted) return;

      currentPosition = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (current) => {
          if (!isMounted) return;
          setLocation(current);
        }
      );
    };

    requestLocation();

    return () => {
      isMounted = false;
      if (currentPosition) {
        currentPosition.remove();
      }
    };
  }, []);

  // Determine if user is currently in China based on location and set up map cameras.
  const isInChina = useMemo(() => {
    if (!location) return false;
    const currentPoint = point([
      location.coords.longitude,
      location.coords.latitude,
    ]);
    return booleanPointInPolygon(currentPoint, CHINA_BOUNDARY);
  }, [location]);

  const amapCameraPosition = useMemo(() => {
    if (!location) {
      return {
        target: { latitude: 39.9042, longitude: 116.4074 },
        zoom: 17,
      };
    }
    
    const gcj = eviltransform.wgs2gcj(
      location.coords.latitude,
      location.coords.longitude
    );
    const gcjLat = Array.isArray(gcj) ? gcj[0] : gcj.lat;
    const gcjLng = Array.isArray(gcj) ? gcj[1] : gcj.lng;

    return {
      target: { latitude: gcjLat, longitude: gcjLng },
      zoom: 17,
    };
  }, [location]);

  const mapboxCenter = useMemo<[number, number] | undefined>(() => {
    if (!location) return undefined;
    return [location.coords.longitude, location.coords.latitude];
  }, [location]);

  const trainDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const geocodeStation = useCallback(async (stationName: string): Promise<LatLng | null> => {
    if (stationName in geocodeCacheRef.current) {
      return geocodeCacheRef.current[stationName] || null;
    }

    const amapWebKey = process.env.EXPO_PUBLIC_AMAP_WEB_API_KEY;
    if (!amapWebKey) return null;

    const candidates = [`${stationName}站`, `${stationName}火车站`, stationName];

    for (const address of candidates) {
      const url = `https://restapi.amap.com/v3/geocode/geo?key=${amapWebKey}&address=${encodeURIComponent(
        address
      )}`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      const locationText = data?.geocodes?.[0]?.location;
      if (!locationText || typeof locationText !== "string") continue;

      const [lngText, latText] = locationText.split(",");
      const longitude = Number(lngText);
      const latitude = Number(latText);
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;

      const point = { latitude, longitude };
      geocodeCacheRef.current[stationName] = point;
      return point;
    }

    geocodeCacheRef.current[stationName] = null;
    return null;
  }, []);

  const loadTrainRoute = useCallback(async () => {
    const fetchLegStationNames = async (leg: RouteTrain, routeData: RouteResponse) => {
      if (!leg?.train_code) return [] as string[];

      const stationPairs: { from: string; to: string }[] = [];
      const pushPair = (fromValue?: string, toValue?: string) => {
        const from = (fromValue || "").trim();
        const to = (toValue || "").trim();
        if (!from || !to) return;
        if (!stationPairs.some((p) => p.from === from && p.to === to)) {
          stationPairs.push({ from, to });
        }
      };

      pushPair(leg.from_station?.zh, leg.to_station?.zh);
      pushPair(leg.from_station?.en, leg.to_station?.en);
      pushPair(routeData.from?.zh, routeData.to?.zh);
      pushPair(requestedFromStation, requestedToStation);

      if (stationPairs.length === 0) return [] as string[];

      const queryStopsByTrainId = async (trainId: string, fromStation: string, toStation: string) => {
        const stopsUrl = `${BACKEND_BASE_URL}/api/trains/stops/${encodeURIComponent(
          trainId
        )}?from_station=${encodeURIComponent(fromStation)}&to_station=${encodeURIComponent(
          toStation
        )}&train_date=${trainDate}`;

        const stopsRes = await fetch(stopsUrl);
        if (!stopsRes.ok) return [] as string[];

        const stopsData = (await stopsRes.json()) as StopsResponse;
        return (stopsData.stations || [])
          .map((s) => s.station_name)
          .filter((name): name is string => Boolean(name));
      };

      const queryTrainNo = async (fromStation: string, toStation: string) => {
        const trainNoUrl = `${BACKEND_BASE_URL}/api/trains/train-no?train_code=${encodeURIComponent(
          leg.train_code || ""
        )}&from_station=${encodeURIComponent(fromStation)}&to_station=${encodeURIComponent(
          toStation
        )}&train_date=${trainDate}`;

        const trainNoRes = await fetch(trainNoUrl);
        if (!trainNoRes.ok) return null;

        const trainNoData = (await trainNoRes.json()) as TrainNoResponse;
        if (!trainNoData?.success || !trainNoData.train_no) return null;
        return trainNoData.train_no;
      };

      // Try several station pairs because some train records use city aliases/terminal variants.
      for (const pair of stationPairs) {
        const byCode = await queryStopsByTrainId(leg.train_code, pair.from, pair.to);
        if (byCode.length >= 3) return byCode;

        const trainNo = await queryTrainNo(pair.from, pair.to);
        if (!trainNo) {
          if (byCode.length >= 2) return byCode;
          continue;
        }

        const byTrainNo = await queryStopsByTrainId(trainNo, pair.from, pair.to);
        if (byTrainNo.length >= 3) return byTrainNo;
        if (byTrainNo.length >= 2) return byTrainNo;
        if (byCode.length >= 2) return byCode;
      }

      return [] as string[];
    };

    try {
      setRouteLoading(true);
      setRouteError(null);

      const routeUrl = `${BACKEND_BASE_URL}/api/trains/route?from_station=${encodeURIComponent(
        requestedFromStation
      )}&to_station=${encodeURIComponent(requestedToStation)}&train_date=${trainDate}`;

      const routeRes = await fetch(routeUrl);
      if (!routeRes.ok) {
        setRouteError("Route request failed");
        return;
      }

      const routeData = (await routeRes.json()) as RouteResponse;
      let directTrains = Array.isArray(routeData.trains) ? routeData.trains : [];
      const transferLegs = Array.isArray(routeData.options) ? routeData.options[0]?.legs || [] : [];

      // Fallback: some route queries return empty transfer payload even when direct tickets exist.
      if (directTrains.length === 0 && transferLegs.length === 0) {
        const ticketsUrl = `${BACKEND_BASE_URL}/api/trains/tickets?from_station=${encodeURIComponent(
          requestedFromStation
        )}&to_station=${encodeURIComponent(requestedToStation)}&train_date=${trainDate}`;

        const ticketsRes = await fetch(ticketsUrl);
        if (ticketsRes.ok) {
          const ticketsData = (await ticketsRes.json()) as TicketsResponse;
          const fallbackTrains = (ticketsData.trains || [])
            .slice(0, 8)
            .map((t) => ({
              train_code: t.train_no,
              from_station: t.from_station ? { zh: t.from_station } : undefined,
              to_station: t.to_station ? { zh: t.to_station } : undefined,
            }))
            .filter((t) => Boolean(t.train_code));

          if (fallbackTrains.length > 0) {
            directTrains = fallbackTrains;
          }
        }
      }

      // Prefer a direct train that actually returns intermediate stops.
      let routeLegs: RouteTrain[] = [];
      let seededStations: string[] = [];

      if (directTrains.length > 0) {
        const candidates = directTrains.slice(0, 6);
        for (const candidate of candidates) {
          const stationNames = await fetchLegStationNames(candidate, routeData);
          if (stationNames.length >= 3) {
            routeLegs = [candidate];
            seededStations = stationNames;
            break;
          }
        }

        if (routeLegs.length === 0) {
          routeLegs = [directTrains[0]];
        }
      } else {
        routeLegs = transferLegs;
      }

      const allStationNames: string[] = [];

      for (const name of seededStations) {
        const last = allStationNames[allStationNames.length - 1];
        if (name !== last) {
          allStationNames.push(name);
        }
      }

      // If we already seeded from a chosen direct train, do not append that same
      // leg again (it creates a long return segment that looks like a straight line).
      if (seededStations.length === 0) {
        for (const leg of routeLegs) {
          const legStationNames = await fetchLegStationNames(leg, routeData);

          for (const name of legStationNames) {
            const last = allStationNames[allStationNames.length - 1];
            if (name !== last) {
              allStationNames.push(name);
            }
          }
        }
      }

      // Fallback only if no station list at all.
      if (allStationNames.length === 0) {
        allStationNames.push(routeData.from?.zh || requestedFromStation);
        allStationNames.push(routeData.to?.zh || requestedToStation);
      }
      setRouteStationCount(allStationNames.length);

      // Geocode sequentially to avoid request bursts dropping intermediate stations.
      const points: LatLng[] = [];
      for (const name of allStationNames) {
        const resolved = await geocodeStation(name);
        if (resolved) {
          points.push(resolved);
        }
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      setRoutePointCount(points.length);

      // Require middle stations, otherwise route degrades to a misleading straight line.
      if (points.length < 3) {
        setTrainPolyline([]);
        setTrainMarkers([]);
        setRouteError("Station-level route unavailable for this train");
        return;
      }

      setTrainPolyline(points);
      setTrainMarkers(points);
    } catch {
      // Keep map usable even if route fetch fails.
      setRouteError("Failed to load route");
    } finally {
      setRouteLoading(false);
    }
  }, [geocodeStation, requestedFromStation, requestedToStation, trainDate]);

  useEffect(() => {
    hasLoadedTrainRoute.current = false;
    hasAppliedOverviewRef.current = false;
    setTrainPolyline([]);
    setTrainMarkers([]);
    setRouteError(null);
    setRouteStationCount(0);
    setRoutePointCount(0);
  }, [requestedFromStation, requestedToStation, shouldOpenRouteOverview]);

  const shouldUseAmap = isInChina || hasRouteParams;

  useEffect(() => {
    if (!location) return;

    // When user explicitly asks for route overview, let route-fit camera logic
    // control first camera movement instead of snapping to current GPS point.
    if (shouldOpenRouteOverview && !hasAppliedOverviewRef.current) {
      return;
    }

    // We only move the camera if:
    // 1. It is the VERY FIRST load (so you don't start at 0,0)
    // 2. OR You just crossed the border (isInChina changed)
    const isFirstLoad = !hasInitialFix.current;
    const isBorderCrossing = lastCountryState.current !== isInChina;

    if (isFirstLoad || isBorderCrossing) {
      if (isInChina) {
        // enter China
        const gcj = eviltransform.wgs2gcj(
          location.coords.latitude,
          location.coords.longitude
        );
        const gcjLat = Array.isArray(gcj) ? gcj[0] : gcj.lat;
        const gcjLng = Array.isArray(gcj) ? gcj[1] : gcj.lng;

        amapRef.current?.moveCamera({
          target: { latitude: gcjLat, longitude: gcjLng },
          zoom: 17,
          duration: 1000,
        });
      } else {
        // exit China
        mapboxCameraRef.current?.setCamera({
          centerCoordinate: [location.coords.longitude, location.coords.latitude],
          zoomLevel: 15,
          animationDuration: 1000,
        });
      }

      // Mark that we handled this state
      lastCountryState.current = isInChina;
      hasInitialFix.current = true;
    }
  }, [location, isInChina, shouldOpenRouteOverview]);

  // if overview is requested, only force a fixed zoom level.
  useEffect(() => {
    if (!shouldOpenRouteOverview || hasAppliedOverviewRef.current) {
      return;
    }
    amapRef.current?.moveCamera({
      zoom: 6,
      duration: 1000,
    });

    hasAppliedOverviewRef.current = true;
    hasInitialFix.current = true;
  }, [shouldOpenRouteOverview]);

  useEffect(() => {
    if (hasLoadedTrainRoute.current) return;

    hasLoadedTrainRoute.current = true;
    loadTrainRoute().catch(() => {
      hasLoadedTrainRoute.current = false;
    });
  }, [loadTrainRoute]);

  return (
    <View style={styles.page}>
      <AMapView
        ref={amapRef}
        style={[styles.map, { zIndex: shouldUseAmap ? 2 : 0, opacity: shouldUseAmap ? 1 : 0 }]}
        pointerEvents={shouldUseAmap ? "auto" : "none"}
        myLocationEnabled={hasPermission === true}
        initialCameraPosition={amapCameraPosition}
        {...({ language: amapLanguage } as any)}
      >
        {trainPolyline.length > 1 && (
          <Polyline points={trainPolyline} width={4} color="#2eb296" />
        )}
        {trainMarkers.map((m, idx) => (
          <Marker key={`train-stop-${idx}`} position={m} />
        ))}
      </AMapView>

      <Mapbox.MapView
        style={[styles.map, { zIndex: !shouldUseAmap ? 2 : 0, opacity: !shouldUseAmap ? 1 : 0 }]}
        pointerEvents={!shouldUseAmap ? "auto" : "none"}
      >
        <Mapbox.Camera
          ref={mapboxCameraRef}
          followUserLocation={false}
          zoomLevel={15}
          centerCoordinate={mapboxCenter}
        />
        <Mapbox.UserLocation visible={hasPermission === true} />
      </Mapbox.MapView>
    {/* Map language flip button */}
     <View style={styles.languageToggleWrap} pointerEvents="box-none">
        <View style={styles.languageToggleCard}>
          <TouchableOpacity
            style={[
              styles.languageBtn,
              amapLanguage === "zh_cn" && styles.languageBtnActive,
            ]}
            onPress={() => setAmapLanguage("zh_cn")}
          >
            <Text
              style={[
                styles.languageBtnText,
                amapLanguage === "zh_cn" && styles.languageBtnTextActive,
              ]}
            >
              中文
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.languageBtn,
              amapLanguage === "en" && styles.languageBtnActive,
            ]}
            onPress={() => setAmapLanguage("en")}
          >
            <Text
              style={[
                styles.languageBtnText,
                amapLanguage === "en" && styles.languageBtnTextActive,
              ]}
            >
              EN
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {(routeLoading || routeError) && (
        <View style={styles.routeStatusWrap} pointerEvents="none">
          <View style={styles.routeStatusCard}>
            <Text style={styles.routeStatusText}>
              {routeLoading
                ? `Loading train route... (${routeStationCount} stops)`
                : `${routeError} (${routePointCount}/${routeStationCount} geocoded)`}
            </Text>
          </View>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  languageToggleWrap: {
    position: "absolute",
    top: 40,
    right: 14,
    zIndex: 999,
    elevation: 20,
  },
  languageToggleCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  languageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  languageBtnActive: {
    backgroundColor: "#2eb296",
  },
  languageBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
  },
  languageBtnTextActive: {
    color: "#fff",
  },
  routeStatusWrap: {
    position: "absolute",
    top: 90,
    right: 14,
    zIndex: 999,
    elevation: 20,
  },
  routeStatusCard: {
    backgroundColor: "rgba(15,23,42,0.86)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 220,
  },
  routeStatusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
});