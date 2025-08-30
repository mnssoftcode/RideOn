import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import * as geofire from 'geofire-common';


export async function updateUserLocationOnce(latitude: number, longitude: number) {
  try {
    const user = auth().currentUser;
    if (!user) return;

    const hash = geofire.geohashForLocation([latitude, longitude]);
    await firestore().collection('users').doc(user.uid).set(
      {
        location: new firestore.GeoPoint(latitude, longitude),
        geohash: hash,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (e) {
    console.error('[Location] Failed to update user location', e);
    throw e;
  }
}

export async function queryNearbyVehicles(lat: number, lng: number, radiusInM = 2000) {
  const center = [lat, lng] as [number, number];
  const bounds = geofire.geohashQueryBounds(center, radiusInM);
  const promises = bounds.map((b) =>
    firestore()
      .collection('users')
      .orderBy('geohash')
      .startAt(b[0])
      .endAt(b[1])
      .limit(50)
      .get(),
  );
  const snapshots = await Promise.all(promises);
  const matching: any[] = [];
  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      const d = doc.data() as any;
      if (!d.location) continue;
      const dist = geofire.distanceBetween(center, [d.location.latitude, d.location.longitude]) * 1000;
      if (dist <= radiusInM) {
        matching.push({ id: doc.id, ...d, distance: dist });
      }
    }
  }
  return matching;
}


