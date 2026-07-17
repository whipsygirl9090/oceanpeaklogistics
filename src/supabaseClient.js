import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    })
  : null;

function requireSupabase() {
  if (!supabase) {
    throw new Error('Remote data service is not configured.');
  }
  return supabase;
}

export function rowToShipment(row) {
  return {
    dbId: row.id,
    id: row.tracking_number,
    customer: row.customer || '',
    service: row.service || 'Security Logistics',
    origin: row.origin || '',
    destination: row.destination || '',
    weight: row.weight || '',
    valueClass: row.value_class || 'Controlled',
    security: row.security || '',
    status: row.status || 'Shipment Created',
    eta: row.eta || '',
    signedBy: row.signed_by || '',
    originServiceArea: row.origin_service_area || row.origin || '',
    destinationServiceArea: row.destination_service_area || row.destination || '',
    pieceCount: row.piece_count || '1',
    scans: Array.isArray(row.shipment_events)
      ? row.shipment_events.map(rowToShipmentEvent)
      : []
  };
}

export function shipmentToRow(shipment) {
  return {
    tracking_number: shipment.id,
    customer: shipment.customer || '',
    service: shipment.service || 'Security Logistics',
    origin: shipment.origin || '',
    destination: shipment.destination || '',
    weight: shipment.weight || '',
    value_class: shipment.valueClass || 'Controlled',
    security: shipment.security || '',
    status: shipment.status || 'Shipment Created',
    eta: shipment.eta || null,
    signed_by: shipment.signedBy || '',
    origin_service_area: shipment.originServiceArea || shipment.origin || '',
    destination_service_area: shipment.destinationServiceArea || shipment.destination || '',
    piece_count: shipment.pieceCount || '1'
  };
}

export function rowToShipmentEvent(row) {
  return {
    eventId: row.id,
    date: row.event_date || '',
    time: row.event_time ? String(row.event_time).slice(0, 5) : '',
    description: row.description || '',
    location: row.location || '',
    piece: row.piece || '1 Piece',
    sortOrder: row.sort_order || 0
  };
}

export function shipmentEventToRow(event, shipmentId) {
  return {
    shipment_id: shipmentId,
    event_date: event.date,
    event_time: event.time,
    description: event.description || '',
    location: event.location || '',
    piece: event.piece || '1 Piece',
    sort_order: event.sortOrder || 0
  };
}

function sortShipmentEvents(shipment) {
  return {
    ...shipment,
    scans: [...shipment.scans].sort((a, b) => (
      `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`) ||
      (b.sortOrder || 0) - (a.sortOrder || 0)
    ))
  };
}

function isMissingEventsTable(error) {
  return ['PGRST200', 'PGRST205'].includes(error?.code);
}

async function attachEventsToShipments(client, shipments) {
  if (!shipments.length) return shipments;

  const shipmentIds = shipments.map((shipment) => shipment.dbId).filter(Boolean);
  if (!shipmentIds.length) return shipments.map(sortShipmentEvents);

  const { data, error } = await client
    .from('shipment_events')
    .select('*')
    .in('shipment_id', shipmentIds)
    .order('event_date', { ascending: false })
    .order('event_time', { ascending: false })
    .order('sort_order', { ascending: false });

  if (error) {
    if (isMissingEventsTable(error)) {
      return shipments.map(sortShipmentEvents);
    }
    throw error;
  }

  const eventsByShipment = new Map();
  data.forEach((eventRow) => {
    const events = eventsByShipment.get(eventRow.shipment_id) || [];
    events.push(rowToShipmentEvent(eventRow));
    eventsByShipment.set(eventRow.shipment_id, events);
  });

  return shipments
    .map((shipment) => ({
      ...shipment,
      scans: eventsByShipment.get(shipment.dbId) || []
    }))
    .map(sortShipmentEvents);
}

export async function fetchShipmentsFromSupabase() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('shipments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return attachEventsToShipments(client, data.map(rowToShipment));
}

export async function fetchShipmentByTrackingNumber(trackingNumber) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('shipments')
    .select('*')
    .eq('tracking_number', trackingNumber)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [shipment] = await attachEventsToShipments(client, [rowToShipment(data)]);
  return shipment;
}

export async function createShipmentInSupabase(shipment) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('shipments')
    .insert(shipmentToRow(shipment))
    .select('*')
    .single();

  if (error) throw error;
  const createdShipment = rowToShipment(data);
  const events = Array.isArray(shipment.scans) ? shipment.scans : [];
  if (!events.length) return createdShipment;

  const rows = events.map((event, index) => shipmentEventToRow(
    { ...event, sortOrder: events.length - index },
    data.id
  ));
  const { error: eventError } = await client.from('shipment_events').insert(rows);
  if (eventError) {
    await client.from('shipments').delete().eq('id', data.id);
    throw eventError;
  }

  return fetchShipmentByTrackingNumber(shipment.id);
}

export async function updateShipmentInSupabase(shipment) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('shipments')
    .update(shipmentToRow(shipment))
    .eq('tracking_number', shipment.id)
    .select('*')
    .single();

  if (error) throw error;

  const [updatedShipment] = await attachEventsToShipments(client, [rowToShipment(data)]);
  return updatedShipment;
}

export async function createShipmentEventInSupabase(shipmentDbId, event) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('shipment_events')
    .insert(shipmentEventToRow(event, shipmentDbId))
    .select('*')
    .single();

  if (error) throw error;
  return rowToShipmentEvent(data);
}

export async function updateShipmentEventInSupabase(eventId, patch) {
  const client = requireSupabase();
  const updateRow = {};
  if ('date' in patch) updateRow.event_date = patch.date;
  if ('time' in patch) updateRow.event_time = patch.time;
  if ('description' in patch) updateRow.description = patch.description;
  if ('location' in patch) updateRow.location = patch.location;
  if ('piece' in patch) updateRow.piece = patch.piece;
  if ('sortOrder' in patch) updateRow.sort_order = patch.sortOrder;

  const { data, error } = await client
    .from('shipment_events')
    .update(updateRow)
    .eq('id', eventId)
    .select('*')
    .single();

  if (error) throw error;
  return rowToShipmentEvent(data);
}

export async function deleteShipmentFromSupabase(trackingNumber) {
  const client = requireSupabase();
  const { error } = await client
    .from('shipments')
    .delete()
    .eq('tracking_number', trackingNumber);

  if (error) throw error;
}

export async function signInAdmin(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutAdmin() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getAdminSession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAdminAuthChange(callback) {
  const client = requireSupabase();
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}
