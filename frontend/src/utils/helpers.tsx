export function formatTimestamp(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('de-DE');
}

export function getStatusColor(status) {
  const map = {
    running: 'bg-green-100 text-green-700',
    online: 'bg-green-100 text-green-700',
    idle: 'bg-yellow-100 text-yellow-700',
    warning: 'bg-orange-100 text-orange-700',
    offline: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

export function getPriorityColor(p) {
  const map = {
    critical: 'text-red-600 font-bold',
    high: 'text-orange-600 font-semibold',
    medium: 'text-yellow-600',
    low: 'text-gray-600'
  };
  return map[p] || 'text-gray-500';
}