const KEY = 'koilog-data';

export const STATUSES = [
  { id: 'matching',  label: 'マッチ中' },
  { id: 'messaging', label: 'メッセージ中' },
  { id: 'dated',     label: 'デート済み' },
  { id: 'dating',    label: '交際中' },
  { id: 'ended',     label: '終了' },
];

export const TL_TYPES = [
  { id: 'date',    label: 'デート' },
  { id: 'call',    label: '通話' },
  { id: 'message', label: 'メッセージ' },
  { id: 'note',    label: 'メモ' },
];

export function statusLabel(id) {
  const s = STATUSES.find(s => s.id === id);
  return s ? s.label : id;
}

export function tlTypeLabel(id) {
  const t = TL_TYPES.find(t => t.id === id);
  return t ? t.label : id;
}

export function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    'id-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
}

function emptyData() {
  return { version: 1, people: [] };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyData();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.people)) return emptyData();
    return data;
  } catch {
    return emptyData();
  }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getPeople() {
  return load().people;
}

export function getPerson(id) {
  return load().people.find(p => p.id === id) || null;
}

export function newPerson() {
  return {
    id: uid(),
    name: '', age: null, app: '', job: '', area: '', hobbies: '',
    avatar: '',
    status: 'matching',
    rating: 0,
    goodPoints: '', badPoints: '', memo: '',
    nextDate: { date: '', plan: '' },
    timeline: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function upsertPerson(person) {
  const data = load();
  person.updatedAt = new Date().toISOString();
  const i = data.people.findIndex(p => p.id === person.id);
  if (i >= 0) data.people[i] = person;
  else data.people.unshift(person);
  save(data);
}

export function deletePerson(id) {
  const data = load();
  data.people = data.people.filter(p => p.id !== id);
  save(data);
}

export function setStatus(id, status) {
  const p = getPerson(id);
  if (!p) return;
  p.status = status;
  upsertPerson(p);
}

export function setRating(id, rating) {
  const p = getPerson(id);
  if (!p) return;
  p.rating = rating;
  upsertPerson(p);
}

export function addTimeline(personId, entry) {
  const p = getPerson(personId);
  if (!p) return;
  p.timeline.push({ id: uid(), ...entry });
  p.timeline.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  upsertPerson(p);
}

export function deleteTimeline(personId, entryId) {
  const p = getPerson(personId);
  if (!p) return;
  p.timeline = p.timeline.filter(t => t.id !== entryId);
  upsertPerson(p);
}

export function exportJson() {
  return JSON.stringify(load(), null, 2);
}

export function importJson(text) {
  const data = JSON.parse(text);
  if (!data || data.version !== 1 || !Array.isArray(data.people)) {
    throw new Error('恋ログのバックアップファイルではありません');
  }
  save(data);
  return data.people.length;
}

export function wipeAll() {
  localStorage.removeItem(KEY);
}
