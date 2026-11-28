import { useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Activity, ArrowDown, ArrowRight, ArrowUpRight, Bell,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Database,
  Gauge, HardDrive, LayoutDashboard, Menu, Search, Server, ShieldCheck,
  SlidersHorizontal, X,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import project from './data/projectData.json';
import {
  alerts as initialAlerts, drives, getChangedSmartCounters, getNonZeroSmartCounters,
  serviceComponents, SMART_COUNTER_IDS, type AlertItem,
} from './data/fleet';

const navigation = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/drives', label: 'Drive inventory', icon: HardDrive },
  { to: '/signals', label: 'SMART signal review', icon: Activity },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/services', label: 'Platform health', icon: Server },
  { to: '/models', label: 'Models & safeguards', icon: ShieldCheck },
];

const colors = { blue: '#3e74a8' };
const chartTooltip = { border: '1px solid #dfe5ea', borderRadius: 5, fontSize: 11 };
const fmt = (value: number) => new Intl.NumberFormat('en-US').format(value);
const displayModel = (model: string) => model === 'TOSHIBA MQ01ABF050' ? 'Toshiba MQ01ABF050' : model;
const models = project.models.map((item) => item.name);
const modelMetrics = project.testMetrics.filter((item) => item.algorithm !== 'isolation_forest');

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const currentPage = navigation.find((item) => item.to === location.pathname)?.label ?? 'Drive details';
  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><HardDrive size={18} /></div>
          <div className="brand-name">HDD Monitor<small>STORAGE OPERATIONS</small></div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={17} /></button>
        </div>
        <div className="fleet-context">
          <span className="section-label">FLEET</span>
          <strong>Storage systems</strong>
          <small>{drives.length} drives · {models.length} model families</small>
        </div>
        <div className="section-label nav-heading">OPERATIONS</div>
        <nav>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setSidebarOpen(false)}>
              <Icon size={16} />{label}
              {label === 'Alerts' && <b>{initialAlerts.length}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="service-indicator"><i /><span>Platform services<small>6 components · 2 retries pending</small></span><ChevronRight size={14} /></div>
          <div className="sidebar-foot">HDD Failure Prediction</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle navigation">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="breadcrumbs"><span>Storage systems</span><ChevronRight size={13} /><strong>{currentPage}</strong></div>
          <div className="top-actions">
            <span className="local-chip"><i /> Local instance</span>
            <span className="top-separator" />
            <span className="last-updated">Collection cycle · 2 min ago</span>
          </div>
        </header>

        <div className="content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/drives" element={<Inventory />} />
            <Route path="/drives/:driveId" element={<DriveDetails />} />
            <Route path="/signals" element={<SignalsReview />} />
            <Route path="/predictions" element={<Navigate to="/signals" replace />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/services" element={<PlatformHealth />} />
            <Route path="/models" element={<ModelsAndSafeguards />} />
            <Route path="*" element={<Overview />} />
          </Routes>
        </div>
        <footer><span>HDD Failure Prediction</span><span>·</span><span>Review signals with the underlying telemetry and model context</span></footer>
      </main>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>;
}

function Panel({ title, description, action, children, className = '' }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>;
}

function Metric({ label, value, note, tone = '', icon }: { label: string; value: string; note: string; tone?: string; icon: React.ReactNode }) {
  return <div className="metric"><div className={`metric-icon ${tone}`}>{icon}</div><span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function StatusBadge({ value }: { value: AlertItem['severity'] | 'Operational' | 'Degraded' | 'Available' | 'Unavailable' }) {
  const key = value.toLowerCase();
  return <span className={`status-badge ${key}`}><i />{value}</span>;
}

function Overview() {
  const navigate = useNavigate();
  const signalDrives = drives.filter((drive) => getNonZeroSmartCounters(drive).length > 0);
  const counterChanges = initialAlerts.filter((alert) => alert.severity === 'Info');
  const unavailable = drives.filter((drive) => !drive.classifierEvaluationAvailable).length;
  const perModel = models.map((model) => {
    const members = drives.filter((drive) => drive.model === model);
    return {
      model: displayModel(model),
      drives: members.length,
    };
  });
  const nonZeroByCounter = [...SMART_COUNTER_IDS].map((id) => {
    const reading = drives.flatMap((drive) => drive.smart).find((item) => item.id === id);
    return {
      attribute: `SMART ${id}`,
      name: reading?.name ?? 'Unknown attribute',
      drives: drives.filter((drive) => drive.smart.some((item) => item.id === id && item.raw > 0)).length,
    };
  });
  const recent = initialAlerts
    .filter((alert) => alert.severity === 'Info' && alert.minutesAgo !== null)
    .sort((a, b) => (a.minutesAgo ?? 0) - (b.minutesAgo ?? 0))
    .slice(0, 5);

  return <>
    <PageHeader eyebrow="FLEET OVERVIEW" title="Drive health" description="Fleet composition, raw SMART indicators and model-evaluation coverage." actions={<button className="button primary-button" onClick={() => navigate('/drives')}><HardDrive size={14} /> Open drive inventory</button>} />
    <div className="metrics-grid">
      <Metric label="Drives monitored" value={String(drives.length)} note={`Across ${models.length} HDD families`} icon={<HardDrive size={16} />} />
      <Metric label="Model families evaluated" value={`${project.classifierModels.length} / ${models.length}`} note="Offline notebook results available" icon={<ShieldCheck size={16} />} />
      <Metric label="Drives with non-zero counters" value={String(signalDrives.length)} note="Raw SMART values · no failure verdict" tone="amber" icon={<Activity size={16} />} />
      <Metric label="Recent counter changes" value={String(counterChanges.length)} note="Increased since previous sample" icon={<Database size={16} />} />
      <Metric label="Drives without classifier" value={String(unavailable)} note="No supervised model evaluated" tone="muted" icon={<CircleHelp size={16} />} />
    </div>

    <div className="coverage-note">
      <CircleHelp size={15} />
      <span><strong>Model coverage</strong> · {unavailable} HGST drives have no supervised failure classifier evaluated in this project. Their raw SMART readings remain visible; no model-based result is inferred.</span>
      <Link to="/models">Review supported models <ArrowRight size={13} /></Link>
    </div>

    <div className="overview-grid">
      <Panel title="Drives by HDD model" description="300-drive fleet apportioned by model counts in the source dataset">
        <div className="chart-area"><ResponsiveContainer><BarChart data={perModel} layout="vertical" margin={{ top: 5, right: 15, bottom: 0, left: 3 }}><CartesianGrid stroke="#edf0f3" horizontal={false} /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={9} /><YAxis type="category" dataKey="model" width={148} tickLine={false} axisLine={false} fontSize={8} /><Tooltip contentStyle={chartTooltip} /><Bar dataKey="drives" name="Drives" fill={colors.blue} radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></div>
      </Panel>
      <Panel title="Non-zero SMART counters" description="Drive counts with raw values above zero; not interpreted as failure">
        <div className="chart-area"><ResponsiveContainer><BarChart data={nonZeroByCounter} layout="vertical" margin={{ top: 5, right: 15, bottom: 0, left: 3 }}><CartesianGrid stroke="#edf0f3" horizontal={false} /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={9} /><YAxis type="category" dataKey="attribute" width={68} tickLine={false} axisLine={false} fontSize={8} /><Tooltip contentStyle={chartTooltip} formatter={(value, _name, item) => [value, item.payload.name]} /><Bar dataKey="drives" name="Drives" fill="#728da7" radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></div>
      </Panel>
    </div>

    <div className="overview-grid">
      <Panel title="Drives with non-zero counters" description="Raw indicators selected for review, without assigning a failure likelihood" action={<Link className="panel-link" to="/signals">Review SMART signals <ArrowRight size={13} /></Link>}>
        <div className="activity-list">{signalDrives.slice(0, 5).map((drive) => <Link className="activity-row" to={`/drives/${drive.id}`} key={drive.id}><span className="activity-glyph info"><Activity size={14} /></span><span className="activity-text"><strong>{drive.id} · {displayModel(drive.model)}</strong><small>{getNonZeroSmartCounters(drive).map((reading) => `SMART ${reading.id}: ${reading.raw}`).join(' · ')}</small></span><ChevronRight size={14} /></Link>)}</div>
      </Panel>
      <Panel title="Recent SMART counter changes" description="Counter increments since the previous sample" action={<Link className="panel-link" to="/alerts">Event queue <ArrowRight size={13} /></Link>}>
        <div className="activity-list">{recent.map((alert) => <Link className="activity-row" to={`/drives/${alert.driveId}`} key={alert.id}><span className={`activity-glyph ${alert.severity.toLowerCase()}`}>{alert.severity === 'Warning' ? <CircleHelp size={14} /> : <Activity size={14} />}</span><span className="activity-text"><strong>{alert.title}</strong><small>{alert.driveId} · {alert.minutesAgo} min ago</small></span><StatusBadge value={alert.severity} /></Link>)}</div>
      </Panel>
    </div>

    <Panel title="Collection to review" description="Production flow keeps model output separate from raw telemetry and human decisions">
      <div className="flow-strip">{[['01', 'Collect', 'SMART readings'], ['02', 'Validate', 'Model-specific schema'], ['03', 'Route', 'Drive-family model'], ['04', 'Infer', 'Versioned output'], ['05', 'Review', 'Operator decision']].map(([number, title, description], index) => <div className="flow-step" key={number}><span>{number}</span><strong>{title}</strong><small>{description}</small>{index < 4 && <ArrowRight size={14} />}</div>)}</div>
    </Panel>
  </>;
}

function Inventory() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [model, setModel] = useState('All models');
  const [counterState, setCounterState] = useState('All counter values');
  const [sortKey, setSortKey] = useState<'model' | 'updated' | 'hours'>('updated');
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const filtered = useMemo(() => drives.filter((drive) =>
    (drive.id.toLowerCase().includes(search.toLowerCase()) || drive.model.toLowerCase().includes(search.toLowerCase())) &&
    (model === 'All models' || drive.model === model) &&
    (counterState === 'All counter values' ||
      (counterState === 'Non-zero counters'
        ? getNonZeroSmartCounters(drive).length > 0
        : getNonZeroSmartCounters(drive).length === 0)),
  ).sort((a, b) => {
    const comparison = sortKey === 'model'
      ? a.model.localeCompare(b.model)
      : sortKey === 'hours'
        ? (a.hours ?? -1) - (b.hours ?? -1)
        : a.updatedMinutes - b.updatedMinutes;
    return ascending ? comparison : -comparison;
  }), [search, model, counterState, sortKey, ascending]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);
  const sortBy = (key: 'model' | 'updated' | 'hours') => {
    if (sortKey === key) setAscending(!ascending);
    else { setSortKey(key); setAscending(key === 'updated'); }
  };
  const clear = () => { setSearch(''); setModel('All models'); setCounterState('All counter values'); setPage(1); };

  return <>
    <PageHeader eyebrow="ASSET MANAGEMENT" title="Drive inventory" description="Search by model and inspect raw SMART readings; no per-drive failure prediction is displayed." actions={<button className="button" onClick={() => { clear(); setPage(1); }}><X size={14} /> Clear filters</button>} />
    <div className="filter-toolbar">
      <label className="search-control"><Search size={15} /><input placeholder="Search drive ID or model" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
      <select value={model} onChange={(event) => { setModel(event.target.value); setPage(1); }} aria-label="Filter by model"><option>All models</option>{models.map((name) => <option key={name} value={name}>{displayModel(name)}</option>)}</select>
      <select value={counterState} onChange={(event) => { setCounterState(event.target.value); setPage(1); }} aria-label="Filter by SMART counter values"><option>All counter values</option><option>Non-zero counters</option><option>No non-zero counters</option></select>
      <span className="results-count"><SlidersHorizontal size={13} />{filtered.length} drives</span>
    </div>
    <Panel title="Monitored drives" description="SMART values are raw device readings. Attribute interpretation and thresholds are model-specific.">
      <div className="table-scroll"><table className="data-table"><thead><tr>
        <th onClick={() => sortBy('model')}>Drive / model {sortKey === 'model' && (ascending ? <ArrowUpRight size={12} /> : <ArrowDown size={12} />)}</th>
        <th>Bay</th><th>Capacity</th><th>SMART 5</th><th>SMART 197</th>
        <th onClick={() => sortBy('hours')}>Power-on hours {sortKey === 'hours' && (ascending ? <ArrowUpRight size={12} /> : <ArrowDown size={12} />)}</th>
        <th>Offline evaluation</th>
        <th onClick={() => sortBy('updated')}>Last reading {sortKey === 'updated' && (ascending ? <ArrowUpRight size={12} /> : <ArrowDown size={12} />)}</th><th />
      </tr></thead><tbody>{shown.map((drive) => <tr key={drive.id} onDoubleClick={() => navigate(`/drives/${drive.id}`)}>
        <td><Link to={`/drives/${drive.id}`}><strong>{drive.id}</strong><small>{displayModel(drive.model)}</small></Link></td>
        <td>{drive.bay}</td><td>{drive.capacityGb >= 1000 ? `${drive.capacityGb / 1000} TB` : `${drive.capacityGb} GB`}</td>
        <td>{drive.smart.find((reading) => reading.id === 5)?.raw ?? '—'}</td><td>{drive.smart.find((reading) => reading.id === 197)?.raw ?? '—'}</td>
        <td>{drive.hours === null ? '—' : fmt(drive.hours)}</td>
        <td><StatusBadge value={drive.classifierEvaluationAvailable ? 'Available' : 'Unavailable'} /></td>
        <td>{drive.updatedMinutes < 60 ? `${drive.updatedMinutes} min ago` : '1 hr ago'}</td>
        <td><Link className="row-arrow" to={`/drives/${drive.id}`} aria-label={`Inspect ${drive.id}`}><ChevronRight size={15} /></Link></td>
      </tr>)}</tbody></table>
      {!shown.length && <div className="empty-state"><HardDrive size={23} /><strong>No drives match these filters</strong><span>Change your search or clear the selected filters.</span></div>}</div>
      <div className="pagination"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button><span>Page {page} of {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={15} /></button></div></div>
    </Panel>
  </>;
}

function DriveDetails() {
  const { driveId } = useParams();
  const drive = drives.find((item) => item.id === driveId);
  const [attribute, setAttribute] = useState('');
  if (!drive) return <Navigate to="/drives" replace />;
  const selected = drive.smart.find((reading) => String(reading.id) === attribute) ?? drive.smart[0];
  const graphData = selected?.history.map((raw, index) => ({ time: `${(7 - index) * 3}h ago`, raw })) ?? [];
  const nonZeroCounters = getNonZeroSmartCounters(drive);
  const changedCounters = getChangedSmartCounters(drive);
  return <>
    <Link className="back-link" to="/drives"><ChevronLeft size={14} />Back to drive inventory</Link>
    <PageHeader eyebrow="DRIVE DETAILS" title={drive.id} description={`${displayModel(drive.model)} · ${drive.bay} · ${drive.capacityGb >= 1000 ? `${drive.capacityGb / 1000} TB` : `${drive.capacityGb} GB}`}`} />
    <div className="detail-summary">
      <div><span>Offline model evaluation</span><strong>{drive.classifierEvaluationAvailable ? 'Available' : 'Not evaluated'}</strong><small>Family-level notebook results · no live inference</small></div>
      <div><span>Power-on hours · SMART 9</span><strong>{drive.hours === null ? 'Not reported' : fmt(drive.hours)}</strong><small>Raw source value</small></div>
      <div><span>Non-zero SMART counters</span><strong>{nonZeroCounters.length}</strong><small>{changedCounters.length} increased since prior sample</small></div>
      <div><span>Last reading</span><strong>{drive.updatedMinutes} min ago</strong><small>{drive.bay}</small></div>
    </div>
    <div className="overview-grid detail-grid">
      <Panel title="SMART counter review" description="A non-zero counter is a raw observation, not a device-failure verdict">
        {nonZeroCounters.length
          ? <div className="signal-review"><strong>Non-zero readings</strong><ul>{nonZeroCounters.map((reading) => <li key={reading.id}>SMART {reading.id} · {reading.name}: {fmt(reading.raw)}{changedCounters.some((item) => item.id === reading.id) ? ' · increased since prior sample' : ''}</li>)}</ul><div className="action-note"><b>Interpretation</b><span>Check the time series and vendor-specific attribute guidance before taking action.</span></div></div>
          : <div className="signal-review"><p>No non-zero values in the selected SMART counters.</p><div className="action-note"><b>Interpretation</b><span>Zero counters do not guarantee that a drive is healthy.</span></div></div>}
        {drive.classifierEvaluationAvailable
          ? <div className="model-route-note"><Activity size={14} /><span>Offline Random Forest and XGBoost metrics exist for this drive family. This application does not run either model on this drive.</span></div>
          : <div className="unavailable-notice"><CircleHelp size={17} /><div><strong>No supervised classifier evaluated</strong><p>Raw SMART readings remain available, but this project has no model-based output for this drive family.</p></div></div>}
      </Panel>
      <Panel title="SMART trend" description={selected ? `${selected.name} · raw values from the recent collection window` : 'No supported SMART history is available'} action={drive.smart.length ? <select className="small-select" value={selected?.id ?? ''} onChange={(event) => setAttribute(event.target.value)} aria-label="Select SMART attribute">{drive.smart.map((reading) => <option key={reading.id} value={reading.id}>SMART {reading.id} · {reading.name}</option>)}</select> : undefined}>
        {selected ? <div className="chart-area detail-chart"><ResponsiveContainer><LineChart data={graphData} margin={{ top: 12, right: 14, bottom: 0, left: -14 }}><CartesianGrid stroke="#edf0f3" vertical={false} /><XAxis dataKey="time" tickLine={false} axisLine={false} fontSize={9} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={9} /><Tooltip contentStyle={chartTooltip} formatter={(value) => [fmt(Number(value)), 'Raw value']} /><Line type="monotone" dataKey="raw" stroke={colors.blue} strokeWidth={2} dot={{ r: 2 }} /></LineChart></ResponsiveContainer></div> : <div className="empty-state"><Database size={20} /><span>SMART readings are unavailable for this drive.</span></div>}
      </Panel>
    </div>
    <Panel title="SMART attributes" description="Raw values only. Normalized values and thresholds are shown only when supplied by the source; they are not inferred here.">
      <div className="table-scroll"><table className="data-table smart-table"><thead><tr><th>ID</th><th>Attribute</th><th>Raw value</th><th>Normalized</th><th>Threshold</th><th>Reading</th></tr></thead><tbody>
        {drive.smart.map((reading) => {
          const isCounter = SMART_COUNTER_IDS.has(reading.id);
          const isNonZero = isCounter && reading.raw > 0;
          return <tr key={reading.id}><td>{reading.id}</td><td>SMART {reading.id} · {reading.name}</td><td>{fmt(reading.raw)}</td><td>—</td><td>—</td><td><span className={isNonZero ? 'reading-flag' : 'reading-normal'}>{isNonZero ? 'Non-zero counter' : 'Recorded'}</span></td></tr>;
        })}
      </tbody></table></div>
    </Panel>
  </>;
}

function SignalsReview() {
  const [search, setSearch] = useState('');
  const [model, setModel] = useState('All models');
  const [counterState, setCounterState] = useState('All counter values');
  const rows = drives.filter((drive) =>
    (drive.id.toLowerCase().includes(search.toLowerCase()) || drive.model.toLowerCase().includes(search.toLowerCase())) &&
    (model === 'All models' || drive.model === model) &&
    (counterState === 'All counter values' ||
      (counterState === 'Non-zero counters'
        ? getNonZeroSmartCounters(drive).length > 0
        : getNonZeroSmartCounters(drive).length === 0)),
  );
  const signalDriveCount = drives.filter((drive) => getNonZeroSmartCounters(drive).length > 0).length;
  const changedDriveCount = initialAlerts.filter((alert) => alert.severity === 'Info').length;
  const withoutEvaluation = drives.filter((drive) => !drive.classifierEvaluationAvailable).length;
  return <>
    <PageHeader eyebrow="SMART TELEMETRY" title="SMART signal review" description="Inspect raw counter values and recent changes without turning them into a per-drive failure prediction." />
    <div className="review-summary"><div><strong>{drives.length}</strong><span>drives tracked</span></div><div><strong>{signalDriveCount}</strong><span>with non-zero counters</span></div><div><strong>{changedDriveCount}</strong><span>recent counter increases</span></div><div><strong>{withoutEvaluation}</strong><span>without classifier evaluation</span></div><p>Counter values are observations. Interpret them with drive-model guidance and history.</p></div>
    <div className="filter-toolbar">
      <label className="search-control"><Search size={15} /><input placeholder="Search drive ID or model" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <select value={model} onChange={(event) => setModel(event.target.value)} aria-label="Filter by model"><option>All models</option>{models.map((name) => <option key={name} value={name}>{displayModel(name)}</option>)}</select>
      <select value={counterState} onChange={(event) => setCounterState(event.target.value)} aria-label="Filter by counter values"><option>All counter values</option><option>Non-zero counters</option><option>No non-zero counters</option></select>
      <span className="results-count"><SlidersHorizontal size={13} />{rows.length} results</span>
    </div>
    <Panel title="Drive telemetry" description="Non-zero counters are listed with their exact raw values; absent model attributes remain blank.">
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Drive / model</th><th>Non-zero SMART counters</th><th>Power-on hours</th><th>Offline evaluation</th><th>Last reading</th><th /></tr></thead><tbody>
        {rows.map((drive) => {
          const counters = getNonZeroSmartCounters(drive);
          return <tr key={drive.id}><td><Link to={`/drives/${drive.id}`}><strong>{drive.id}</strong><small>{displayModel(drive.model)}</small></Link></td><td className="recommend-cell">{counters.length ? counters.map((reading) => `SMART ${reading.id}: ${fmt(reading.raw)}`).join(' · ') : 'None recorded'}</td><td>{drive.hours === null ? '—' : fmt(drive.hours)}</td><td><StatusBadge value={drive.classifierEvaluationAvailable ? 'Available' : 'Unavailable'} /></td><td>{drive.updatedMinutes} min ago</td><td><Link className="row-arrow" to={`/drives/${drive.id}`} aria-label={`Review ${drive.id}`}><ChevronRight size={15} /></Link></td></tr>;
        })}
      </tbody></table></div>
    </Panel>
  </>;
}

function Alerts() {
  const [items, setItems] = useState<AlertItem[]>(initialAlerts);
  const [severity, setSeverity] = useState('All event types');
  const [model, setModel] = useState('All models');
  const [search, setSearch] = useState('');
  const shown = items.filter((item) =>
    (severity === 'All event types' || item.severity === severity) &&
    (model === 'All models' || item.model === model) &&
    `${item.title} ${item.detail} ${item.driveId} ${item.model}`.toLowerCase().includes(search.toLowerCase()),
  );
  const acknowledge = (id: string) => setItems((current) => current.map((item) => item.id === id ? { ...item, acknowledged: true } : item));
  const openCounterChanges = items.filter((item) => item.severity === 'Info' && !item.acknowledged).length;
  const openCoverageGaps = items.filter((item) => item.severity === 'Warning' && !item.acknowledged).length;
  return <>
    <PageHeader eyebrow="OPERATOR QUEUE" title="Alerts" description="Review raw SMART counter changes and model-coverage gaps; neither is presented as a failure prediction." />
    <div className="alert-counts"><div><span className="amber-dot" />{openCoverageGaps}<small>Coverage gaps</small></div><div><span className="gray-dot" />{openCounterChanges}<small>SMART changes</small></div><div><Check size={13} />{items.filter((item) => item.acknowledged).length}<small>Acknowledged</small></div></div>
    <div className="filter-toolbar">
      <label className="search-control"><Search size={15} /><input placeholder="Search alert, drive or model" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <select value={severity} onChange={(event) => setSeverity(event.target.value)} aria-label="Filter by event type"><option>All event types</option><option>Warning</option><option>Info</option></select>
      <select value={model} onChange={(event) => setModel(event.target.value)} aria-label="Filter by model"><option>All models</option>{models.map((name) => <option key={name} value={name}>{displayModel(name)}</option>)}</select>
      <span className="results-count">{shown.length} alerts</span>
    </div>
    <div className="alert-list">{shown.map((item) => <article className={`alert-card ${item.severity.toLowerCase()} ${item.acknowledged ? 'acknowledged' : ''}`} key={item.id}>
      <div className="alert-icon">{item.severity === 'Warning' ? <CircleHelp size={16} /> : <Activity size={16} />}</div>
      <div className="alert-main"><div className="alert-title"><h2>{item.title}</h2><StatusBadge value={item.severity} />{item.acknowledged && <span className="ack-label"><Check size={12} />Acknowledged</span>}</div><p>{item.detail}</p><div className="alert-meta"><Link to={`/drives/${item.driveId}`}>{item.driveId} · {displayModel(item.model)} <ArrowUpRight size={12} /></Link>{item.minutesAgo !== null && <span>{item.minutesAgo} min ago</span>}<span>Recommended: {item.action}</span></div></div>
      {!item.acknowledged && <button className="button acknowledge-button" onClick={() => acknowledge(item.id)}><Check size={13} /> Acknowledge</button>}
    </article>)}</div>
  </>;
}

function PlatformHealth() {
  const operational = serviceComponents.filter((item) => item.state === 'Operational').length;
  return <>
    <PageHeader eyebrow="SYSTEM HEALTH" title="Platform health" description="Collection, validation, inference and alert-delivery health with scaling and recovery signals." actions={<span className="service-state"><i />{operational} / {serviceComponents.length} operational</span>} />
    <div className="service-metrics">
      <Metric label="Collector agents" value="18 / 18" note="All agents reporting" tone="green" icon={<HardDrive size={16} />} />
      <Metric label="Ingestion rate" value="2,460 / min" note="Queue depth 14 · within target" icon={<Database size={16} />} />
      <Metric label="Inference latency" value="84 ms" note="p95 · 3 workers active" tone="green" icon={<Gauge size={16} />} />
      <Metric label="Alert delivery" value="2 retries" note="Queued for retry · no events dropped" tone="amber" icon={<Bell size={16} />} />
    </div>
    <Panel title="Service status" description="Operational components and current load indicators">
      <div className="table-scroll"><table className="data-table service-table"><thead><tr><th>Component</th><th>Status</th><th>Current signal</th><th>Reliability / scaling behavior</th></tr></thead><tbody>{serviceComponents.map((service) => <tr key={service.name}><td><strong>{service.name}</strong></td><td><StatusBadge value={service.state as 'Operational' | 'Degraded'} /></td><td><strong>{service.detail}</strong><small>{service.metric}</small></td><td className="recommend-cell">{service.scale}</td></tr>)}</tbody></table></div>
    </Panel>
    <div className="overview-grid">
      <Panel title="Capacity and horizontal scaling" description="Signals used to scale ingestion and model workers">
        <div className="capacity-list">
          <Capacity label="Inference worker utilization" value={41} detail="3 workers · scale-out target 70%" />
          <Capacity label="Ingestion queue capacity" value={14} max={100} detail="14 / 100 buffered batches" />
          <Capacity label="Schema rejection rate" value={0.2} max={5} detail="0.2% · quarantine and inspect invalid readings" />
        </div>
        <div className="design-note"><strong>Scaling strategy</strong><p>For fleets of thousands of drives, collectors publish asynchronously to partitioned queues. Ingestion and inference services scale independently with stateless workers; partition keys preserve per-drive processing order.</p></div>
      </Panel>
      <Panel title="Failure handling" description="Missing and delayed results stay visible">
        <div className="recovery-list">
          <RecoveryItem title="Collector disconnects" text="Buffer locally, retry with backoff, and mark the last reading stale after its freshness window." />
          <RecoveryItem title="Invalid or missing SMART fields" text="Quarantine schema failures; do not coerce absent features to zero." />
          <RecoveryItem title="Inference timeout / unavailable model" text="Retain telemetry, retry through the queue, and show prediction as unavailable—not healthy." />
          <RecoveryItem title="Alert-delivery failure" text="Keep the event pending, retry idempotently and escalate after the delivery window." />
        </div>
      </Panel>
    </div>
    <div className="service-callout"><ShieldCheck size={15} /><span><strong>Operational controls:</strong> authenticated agents, encrypted transport, least-privilege service identities, request validation, secrets management and audit logging belong at the collection and API boundaries.</span></div>
  </>;
}

function Capacity({ label, value, max = 100, detail }: { label: string; value: number; max?: number; detail: string }) {
  const width = Math.max(1, Math.min(100, (value / max) * 100));
  return <div className="capacity-item"><div><strong>{label}</strong><span>{detail}</span></div><div className="capacity-track"><i style={{ width: `${width}%` }} /></div></div>;
}

function RecoveryItem({ title, text }: { title: string; text: string }) {
  return <div className="recovery-item"><span><Check size={12} /></span><div><strong>{title}</strong><small>{text}</small></div></div>;
}

function ModelsAndSafeguards() {
  const [selected, setSelected] = useState(project.classifierModels[0]);
  const scores = modelMetrics.filter((item) => item.model === selected);
  const model = project.models.find((item) => item.name === selected)!;
  return <>
    <PageHeader eyebrow="MODEL OPERATIONS" title="Models & safeguards" description="Model-family offline evaluation results and safeguards for a future production inference service." actions={<label className="select-control"><span>Drive model</span><select value={selected} onChange={(event) => setSelected(event.target.value)}>{project.classifierModels.map((name) => <option key={name} value={name}>{displayModel(name)}</option>)}</select><ChevronDown size={13} /></label>} />
    <div className="route-banner"><div className="route-icon"><Activity size={17} /></div><div><strong>{displayModel(selected)} · offline evaluation</strong><span>{model.features.length} model-specific raw SMART features · Random Forest and XGBoost results are available for this drive family. This app does not run inference.</span></div><span className="route-state"><i />Evaluation results</span></div>
    <Panel title="Offline test results" description={`${displayModel(selected)} · saved Notebook 04 metrics · ${fmt(scores[0]?.support ?? 0)} held-out rows`}>
      <div className="table-scroll"><table className="data-table model-metrics"><thead><tr><th>Classifier</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1</th><th>ROC AUC</th><th>Average precision</th></tr></thead><tbody>{scores.map((item) => <tr key={item.algorithm}><td><strong>{item.algorithm === 'random_forest' ? 'Random Forest' : 'XGBoost'}</strong></td><td>{(item.accuracy * 100).toFixed(2)}%</td><td>{(item.precision * 100).toFixed(2)}%</td><td>{(item.recall * 100).toFixed(2)}%</td><td>{(item.f1 * 100).toFixed(2)}%</td><td>{(item.roc_auc * 100).toFixed(2)}%</td><td>{(item.average_precision * 100).toFixed(2)}%</td></tr>)}</tbody></table></div>
      <p className="metrics-caveat">These are historical test results, not current inference telemetry. The training notebook documents post-split positive resampling that may expose held-out examples; validate with leakage-free splits before using metrics for production decisions.</p>
    </Panel>
    <div className="overview-grid">
      <Panel title="Evaluated model families" description="Saved offline experiments, not live inference routes">
        <div className="registry-list">{project.classifierModels.map((name) => <div className="registry-row" key={name}><span className="registry-icon"><Database size={14} /></span><div><strong>{displayModel(name)}</strong><small>Random Forest · XGBoost · {project.models.find((item) => item.name === name)?.features.length} raw features</small></div><StatusBadge value="Available" /></div>)}
          <div className="registry-row unsupported"><span className="registry-icon"><CircleHelp size={14} /></span><div><strong>HGST HMS5C4040BLE640</strong><small>Dataset available · no supervised failure classifier evaluated</small></div><StatusBadge value="Unavailable" /></div>
        </div>
      </Panel>
      <Panel title="Decision safeguards" description="Offline metrics do not establish an individual drive's condition">
        <div className="safeguard-list">
          <RecoveryItem title="Human confirmation" text="Use SMART history, redundancy state and operating context before maintenance. Never trigger destructive action from a model score alone." />
          <RecoveryItem title="Missing is not healthy" text="Stale telemetry, schema mismatch or inference failure must yield an explicit unknown/unavailable state." />
          <RecoveryItem title="Model-specific monitoring" text="Compare precision, recall and false-negative rates by drive family; aggregate metrics can hide weak performance on a minority model." />
          <RecoveryItem title="Class imbalance" text="Failures are rare in several model datasets. Report precision, recall and false-negative rates with class support; accuracy alone can hide missed failures." />
          <RecoveryItem title="Calibration and uncertainty" text="Validate score calibration and decision thresholds on leakage-free time-based data. Communicate uncertainty rather than presenting a score as certainty." />
          <RecoveryItem title="Data and drift checks" text="Track missingness, feature distributions, class prevalence and delayed ground-truth outcomes; review before retraining or promoting an artifact." />
        </div>
      </Panel>
    </div>
  </>;
}

export default App;
