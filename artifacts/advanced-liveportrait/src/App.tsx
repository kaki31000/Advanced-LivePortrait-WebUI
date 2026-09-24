import {
  Aperture,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Copy,
  FileVideo,
  FolderKanban,
  ImageIcon,
  Info,
  KeyRound,
  Languages,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Mic2,
  MonitorPlay,
  PanelLeftClose,
  Play,
  Plus,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  WandSparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';

type ProjectStatus = 'draft' | 'queued' | 'ready';

type Scene = {
  id: string;
  imagePreview: string;
  imageName?: string;
  script: string;
};

type Project = {
  id: string;
  name: string;
  avatarPreview?: string;
  avatarName?: string;
  script: string;
  scene: string;
  voice: string;
  speed: number;
  format: string;
  status: ProjectStatus;
  videoUrl?: string;
  scenes?: Scene[];
  updatedAt: string;
  createdAt: string;
};

type AppSettings = {
  language: string;
  format: string;
  reducedMotion: boolean;
};

const PROJECTS_KEY = 'advanced-liveportrait-projects';
const SETTINGS_KEY = 'advanced-liveportrait-settings';

const seedProjects: Project[] = [
  {
    id: 'studio-welcome',
    name: 'Bienvenue dans le studio',
    script: 'Bienvenue dans votre espace de création vidéo.',
    scene: 'portrait',
    voice: 'Claire — français',
    speed: 1,
    format: '16:9',
    status: 'ready',
    updatedAt: '2024-06-18T10:20:00.000Z',
    createdAt: '2024-06-16T09:00:00.000Z',
  },
  {
    id: 'product-launch',
    name: 'Lancement de juin',
    script: 'Voici les trois nouveautés qui arrivent ce mois-ci.',
    scene: 'studio',
    voice: 'Thomas — français',
    speed: 1.05,
    format: '9:16',
    status: 'draft',
    updatedAt: '2024-06-17T15:45:00.000Z',
    createdAt: '2024-06-17T15:45:00.000Z',
  },
];

function readProjects(): Project[] {
  try {
    const stored = localStorage.getItem(PROJECTS_KEY);
    if (stored) return JSON.parse(stored) as Project[];
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(seedProjects));
  } catch {
    return seedProjects;
  }
  return seedProjects;
}

function readSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored) as AppSettings;
  } catch {
    // Local preferences are optional.
  }
  return { language: 'fr', format: 'mp4', reducedMotion: false };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(value));
}

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function apiUrl(path: string) {
  const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${basePath}api${path}`;
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire cette image.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Cette image ne peut pas être utilisée.'));
      image.onload = () => {
        const maxDimension = 1280;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function StatusPill({ status }: { status: ProjectStatus }) {
  const labels = { draft: 'Brouillon', queued: 'En attente', ready: 'Prêt' };
  const icons = {
    draft: <CircleDashed size={13} />,
    queued: <Clock3 size={13} />,
    ready: <CheckCircle2 size={13} />,
  };
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide',
      status === 'ready' && 'bg-[#d9f0eb] text-[#256d64]',
      status === 'queued' && 'bg-[#fff0c2] text-[#805f1c]',
      status === 'draft' && 'bg-[#eee9e1] text-[#746d65]',
    )} data-testid={`status-project-${status}`}>
      {icons[status]}
      {labels[status]}
    </span>
  );
}

function AvatarPreview({ project, compact = false }: { project: Partial<Project>; compact?: boolean }) {
  if (project.avatarPreview) {
    return (
      <img
        src={project.avatarPreview}
        alt={`Avatar de ${project.name || 'la scène'}`}
        className={cn('h-full w-full object-cover', compact ? 'aspect-[4/3]' : 'aspect-[4/5]')}
        data-testid={`img-avatar-${project.id || 'preview'}`}
      />
    );
  }
  return (
    <div className="relative flex h-full w-full items-end justify-center overflow-hidden bg-[linear-gradient(145deg,#e8d9d0_0%,#efc4af_46%,#e88976_100%)]">
      <div className="absolute left-[16%] top-[16%] h-2 w-2 rounded-full bg-[#342d3b]/70" />
      <div className="absolute right-[22%] top-[22%] h-2 w-2 rounded-full bg-[#342d3b]/70" />
      <div className="mb-[-10%] h-[74%] w-[64%] rounded-[48%_48%_18%_18%] bg-[#f1b294] shadow-[inset_0_-28px_0_#655065]">
        <div className="mx-auto mt-[30%] h-1.5 w-9 rounded-full bg-[#905a55]" />
      </div>
      <span className="absolute bottom-3 left-3 rounded bg-[#342d3b]/75 px-2 py-1 text-[10px] font-semibold text-[#fff7eb]">
        Image à ajouter
      </span>
    </div>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const links = [
    { href: '/', label: 'Vue d’ensemble', icon: LayoutDashboard, testid: 'link-dashboard' },
    { href: '/projects', label: 'Mes projets', icon: FolderKanban, testid: 'link-projects' },
  ];
  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col bg-[#292538] px-4 py-5 text-[#f7f0e5]" data-testid="sidebar">
      <div className="flex items-center justify-between px-2">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.5" data-testid="link-brand">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f48770] text-[#292538] shadow-[0_5px_0_#be5c59]">
            <Aperture size={20} strokeWidth={2.5} />
          </span>
          <span className="font-[var(--app-font-serif)] text-[19px] font-semibold tracking-tight">Mirlift</span>
        </Link>
        {onClose && (
          <button className="rounded-lg p-2 text-[#b9b0be] hover:bg-[#3a344b] md:hidden" onClick={onClose} aria-label="Fermer le menu" data-testid="button-close-menu">
            <PanelLeftClose size={19} />
          </button>
        )}
      </div>

      <div className="mt-11 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#958ca1]">Espace de travail</div>
      <nav className="mt-3 space-y-1" aria-label="Navigation principale">
        {links.map(({ href, label, icon: Icon, testid }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors',
              (location === href || (href === '/projects' && location.startsWith('/create')))
                ? 'bg-[#454055] text-[#fffaf3] shadow-[inset_3px_0_0_#f48770]'
                : 'text-[#b9b0be] hover:bg-[#3a344b] hover:text-[#fffaf3]',
            )}
            data-testid={testid}
          >
            <Icon size={17} strokeWidth={1.9} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-9 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#958ca1]">Configuration</div>
      <Link
        href="/settings"
        onClick={onClose}
        className={cn(
          'mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors',
          location === '/settings' ? 'bg-[#454055] text-[#fffaf3] shadow-[inset_3px_0_0_#f48770]' : 'text-[#b9b0be] hover:bg-[#3a344b] hover:text-[#fffaf3]',
        )}
        data-testid="link-settings"
      >
        <Settings2 size={17} strokeWidth={1.9} />
        Réglages
      </Link>

      <div className="mt-auto rounded-2xl border border-[#4a4354] bg-[#332e42] p-3.5">
        <div className="flex items-center gap-2 text-[#f5c889]">
          <Sparkles size={15} />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em]">Moteur local</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#b9b0be]">LivePortrait est prêt à accueillir votre configuration locale.</p>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-[#a7d8cc]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8ccdbd]" />
          Hors connexion cloud
        </div>
      </div>
      <div className="mt-4 px-2 text-[11px] text-[#958ca1]">Mirlift Studio · v0.1</div>
    </aside>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="grain min-h-[100dvh] bg-[#f6f0e6] text-[#292538]">
      <div className="fixed inset-y-0 left-0 z-50 hidden md:flex">
        <Sidebar />
      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-[#292538]/45" onClick={() => setMenuOpen(false)} />
          <div className="relative flex h-full">
            <Sidebar onClose={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
      <div className="min-h-[100dvh] md:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#e6ddd0] bg-[#f6f0e6]/90 px-5 backdrop-blur md:px-9">
          <button className="rounded-xl border border-[#dfd5c7] bg-[#fbf7f0] p-2 text-[#5e5662] md:hidden" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu" data-testid="button-open-menu">
            <Menu size={19} />
          </button>
          <div className="hidden items-center gap-2 text-xs text-[#8d847c] md:flex">
            <span className="h-2 w-2 rounded-full bg-[#8ccdbd]" />
            Environnement local
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative rounded-xl p-2 text-[#6e6670] transition-colors hover:bg-[#ece3d7]" aria-label="Notifications" data-testid="button-notifications">
              <Bell size={18} strokeWidth={1.8} />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#f48770]" />
            </button>
            <div className="flex items-center gap-2.5 border-l border-[#dfd5c7] pl-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#f5c889] text-xs font-bold text-[#292538]">CL</div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold text-[#342d3b]">Camille Laurent</p>
                <p className="text-[10px] text-[#938982]">Créateur local</p>
              </div>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div className="reveal">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.17em] text-[#d36e5e]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f48770]" />
          {eyebrow}
        </div>
        <h1 className="font-[var(--app-font-serif)] text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[.96] tracking-[-0.045em] text-[#292538]">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#766e68]">{description}</p>}
      </div>
      {action && <div className="reveal reveal-delay-1 shrink-0">{action}</div>}
    </div>
  );
}

function PrimaryButton({ children, onClick, href, testid, icon, type = 'button' }: { children: ReactNode; onClick?: () => void; href?: string; testid: string; icon?: ReactNode; type?: 'button' | 'submit' }) {
  const className = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#f48770] px-4 py-2.5 text-sm font-bold text-[#292538] shadow-[0_3px_0_#c8635c] transition-all hover:-translate-y-0.5 hover:bg-[#fa987f] active:translate-y-0 active:shadow-none";
  if (href) return <Link href={href} className={className} data-testid={testid}>{icon}{children}</Link>;
  return <button type={type} onClick={onClick} className={className} data-testid={testid}>{icon}{children}</button>;
}

function GhostButton({ children, onClick, href, testid, icon, danger = false }: { children: ReactNode; onClick?: () => void; href?: string; testid: string; icon?: ReactNode; danger?: boolean }) {
  const className = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors",
    danger ? "border-[#f0c4bd] text-[#c95c53] hover:bg-[#fff0ed]" : "border-[#ddd2c4] bg-[#fbf7f0] text-[#635b64] hover:border-[#c7bbb0] hover:bg-[#eee7dd]",
  );
  if (href) return <Link href={href} className={className} data-testid={testid}>{icon}{children}</Link>;
  return <button type="button" onClick={onClick} className={className} data-testid={testid}>{icon}{children}</button>;
}

function Dashboard({ projects, onDelete }: { projects: Project[]; onDelete: (id: string) => void }) {
  const recent = projects.slice().sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 3);
  const readyCount = projects.filter((project) => project.status === 'ready').length;
  return (
    <div className="studio-grid min-h-[calc(100dvh-68px)] px-5 py-8 md:px-9 md:py-11">
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="reveal">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#d36e5e]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f48770]" />
              Mardi 18 juin · studio local
            </div>
            <h1 className="max-w-2xl font-[var(--app-font-serif)] text-[clamp(2.5rem,6vw,5.5rem)] font-semibold leading-[.88] tracking-[-0.065em] text-[#292538]">
              Donnez une voix<br className="hidden sm:block" /> à vos images.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-[#766e68]">Transformez un portrait et quelques lignes en une présence vidéo qui vous ressemble. Tout reste dans votre espace local.</p>
          </div>
          <PrimaryButton href="/create" testid="button-create-project" icon={<Plus size={18} />}>Nouveau projet</PrimaryButton>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Projets au total', value: projects.length.toString().padStart(2, '0'), note: 'dans votre espace' },
            { label: 'Prêts à partager', value: readyCount.toString().padStart(2, '0'), note: 'rendus disponibles' },
            { label: 'Moteur de rendu', value: 'Local', note: 'LivePortrait · hors ligne' },
          ].map((stat, index) => (
            <div key={stat.label} className={cn('reveal rounded-2xl border border-[#e4dacc] bg-[#fbf7f0]/75 p-5', index === 2 && 'bg-[#e9f3ef]/75')} style={{ animationDelay: `${index * 70 + 100}ms` }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#948a82]">{stat.label}</p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="font-[var(--app-font-serif)] text-3xl font-semibold tracking-[-0.04em] text-[#292538]">{stat.value}</p>
                <p className="mb-1 text-right text-[11px] text-[#827973]">{stat.note}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-end justify-between border-b border-[#ded3c5] pb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#d36e5e]">Votre atelier</p>
            <h2 className="mt-1 font-[var(--app-font-serif)] text-2xl font-semibold tracking-[-0.03em]">Travaux récents</h2>
          </div>
          <Link href="/projects" className="flex items-center gap-1 text-xs font-bold text-[#746a70] transition-colors hover:text-[#d36e5e]" data-testid="link-view-all-projects">
            Tout voir <ArrowUpRight size={14} />
          </Link>
        </div>

        {recent.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {recent.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <EmptyProjects />
        )}

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <div className="relative overflow-hidden rounded-3xl bg-[#292538] p-7 text-[#f9f0e5] sm:p-9">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[28px] border-[#f48770]/25" />
            <div className="absolute -right-1 top-10 h-40 w-40 rounded-full border border-[#f5c889]/30" />
            <div className="relative max-w-lg">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.17em] text-[#f5c889]"><WandSparkles size={14} /> Premier pas</div>
              <h2 className="mt-5 font-[var(--app-font-serif)] text-3xl font-semibold leading-tight tracking-[-0.04em]">Un bon portrait.<br />Une idée claire.<br /><span className="text-[#f48770]">C’est déjà une scène.</span></h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#bfb5c0]">Pour un résultat naturel, utilisez une image nette, bien éclairée, cadrée au visage.</p>
              <Link href="/create" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#f9f0e5] underline decoration-[#f48770] decoration-2 underline-offset-4" data-testid="link-start-guide">Commencer un projet <ChevronRight size={16} /></Link>
            </div>
          </div>
          <div className="rounded-3xl border border-[#e4dacc] bg-[#fbf7f0] p-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.17em] text-[#8f847a]"><Info size={14} /> À savoir</div>
              <span className="rounded-full bg-[#eee7dd] px-2 py-1 text-[10px] font-bold text-[#827773]">v0.1</span>
            </div>
            <h3 className="mt-8 font-[var(--app-font-serif)] text-2xl font-semibold tracking-[-0.035em]">Le rendu reste<br />sur votre machine.</h3>
            <p className="mt-4 text-sm leading-relaxed text-[#766e68]">Cette première version prépare vos scènes pour le moteur LivePortrait local. Aucun fichier ne quitte cet espace.</p>
            <div className="mt-7 flex items-center gap-2 border-t border-[#e8ded2] pt-4 text-xs font-semibold text-[#477c72]"><Check size={15} /> Vos brouillons sont sauvegardés automatiquement</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, index, onDelete }: { project: Project; index: number; onDelete: (id: string) => void }) {
  const [, setLocation] = useLocation();
  return (
    <article className="reveal group overflow-hidden rounded-2xl border border-[#e4dacc] bg-[#fbf7f0] transition-all hover:-translate-y-1 hover:border-[#d5c6b6] hover:shadow-[0_16px_28px_-20px_rgba(41,37,56,.4)]" style={{ animationDelay: `${index * 75 + 200}ms` }} data-testid={`card-project-${project.id}`}>
      <div>
        <button className="block w-full text-left" onClick={() => setLocation(`/create/${project.id}`)} data-testid={`button-open-project-${project.id}`}>
        <div className="relative aspect-[1.75/1] overflow-hidden bg-[#e8d9d0]">
          <AvatarPreview project={project} compact />
          <div className="absolute right-3 top-3"><StatusPill status={project.status} /></div>
          <div className="absolute bottom-3 left-3 grid h-8 w-8 place-items-center rounded-full bg-[#292538]/80 text-[#fff7ec] opacity-0 transition-opacity group-hover:opacity-100"><Play size={13} fill="currentColor" /></div>
        </div>
        </button>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="line-clamp-1 text-sm font-bold text-[#342d3b]">{project.name}</h3><p className="mt-1 text-[11px] text-[#948981]">{formatDate(project.updatedAt)} · {project.format}</p></div>
            <button aria-label={`Supprimer ${project.name}`} onClick={() => onDelete(project.id)} className="rounded-lg p-1.5 text-[#a2978d] opacity-60 transition-colors hover:bg-[#f0e7dc] hover:text-[#ca5f53] group-hover:opacity-100" data-testid={`button-delete-project-${project.id}`}><Trash2 size={15} /></button>
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyProjects() {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-[#d8cabb] bg-[#fbf7f0]/60 p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f8d8c9] text-[#d36e5e]"><FileVideo size={22} /></div>
      <h3 className="mt-4 font-[var(--app-font-serif)] text-xl font-semibold">Votre atelier est vide</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[#817873]">Créez votre première scène parlante pour commencer à donner vie à vos idées.</p>
      <PrimaryButton href="/create" testid="button-create-empty" icon={<Plus size={17} />}>Créer une scène</PrimaryButton>
    </div>
  );
}

function CreatePage({ projects, onSave }: { projects: Project[]; onSave: (project: Project) => void }) {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const existing = params.id ? projects.find((project) => project.id === params.id) : undefined;
  const [name, setName] = useState(existing?.name ?? 'Ma nouvelle scène');
  const [script, setScript] = useState(existing?.script ?? '');
  const [scene, setScene] = useState(existing?.scene ?? 'portrait');
  const [voice, setVoice] = useState(existing?.voice ?? 'Claire — français');
  const [speed, setSpeed] = useState(existing?.speed ?? 1);
  const [format, setFormat] = useState(existing?.format ?? '16:9');
  const [avatarPreview, setAvatarPreview] = useState(existing?.avatarPreview);
  const [avatarName, setAvatarName] = useState(existing?.avatarName);
  const [isSaving, setIsSaving] = useState(false);
  const [generationQueued, setGenerationQueued] = useState(existing?.status === 'queued');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generationNotice, setGenerationNotice] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(existing?.videoUrl);
  const [additionalScenes, setAdditionalScenes] = useState<Scene[]>(() => existing?.scenes?.slice(1) ?? []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sceneFilesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name); setScript(existing.script); setScene(existing.scene); setVoice(existing.voice);
    setSpeed(existing.speed); setFormat(existing.format); setAvatarPreview(existing.avatarPreview); setAvatarName(existing.avatarName);
    setGenerationQueued(existing.status === 'queued');
    setGeneratedVideoUrl(existing.videoUrl);
    setAdditionalScenes(existing.scenes?.slice(1) ?? []);
    setGenerationError('');
    setGenerationNotice('');
  }, [existing?.id]);

  const buildScenes = (): Scene[] => [
    ...(avatarPreview ? [{ id: 'main-scene', imagePreview: avatarPreview, imageName: avatarName, script }] : []),
    ...additionalScenes,
  ];

  const makeProject = (status: ProjectStatus, videoUrl = generatedVideoUrl): Project => {
    const now = new Date().toISOString();
    return {
      id: existing?.id ?? `project-${Date.now()}`,
      name: name.trim() || 'Scène sans titre',
      avatarPreview, avatarName, script, scene, voice, speed, format, status, videoUrl,
      scenes: buildScenes(),
      updatedAt: now, createdAt: existing?.createdAt ?? now,
    };
  };

  const saveDraft = (status: ProjectStatus = 'draft') => {
    setIsSaving(true);
    window.setTimeout(() => {
      const project = makeProject(status);
      onSave(project);
      setIsSaving(false);
      if (status === 'draft') setLocation('/projects');
    }, 220);
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setAvatarPreview(await readImageAsDataUrl(file));
      setAvatarName(file.name);
      setGenerationError('');
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Impossible de lire cette image.');
    }
    event.target.value = '';
  };

  const handleAdditionalUploads = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, 7 - additionalScenes.length);
    if (files.length === 0) return;
    try {
      const uploadedScenes = await Promise.all(files.map(async (file, index) => ({
        id: `scene-${Date.now()}-${index}`,
        imagePreview: await readImageAsDataUrl(file),
        imageName: file.name,
        script: '',
      })));
      setAdditionalScenes((current) => [...current, ...uploadedScenes]);
      setGenerationError('');
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Impossible de lire une des images.');
    }
    event.target.value = '';
  };

  const updateAdditionalScene = (id: string, patch: Partial<Scene>) => {
    setAdditionalScenes((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const generateVideo = async () => {
    const scenes = buildScenes();
    if (scenes.length === 0) {
      setGenerationError('Importez au moins une image d’avatar avant de générer la vidéo.');
      return;
    }
    if (scenes.every((item) => !item.script.trim())) {
      setGenerationError('Ajoutez un script à au moins une scène avant de générer la vidéo.');
      return;
    }

    setIsGenerating(true);
    setGenerationError('');
    setGenerationNotice('');
    setGenerationQueued(false);
    try {
      const response = await fetch(apiUrl('/render'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          voice,
          speed,
          scenes: scenes.map((item) => ({ imageDataUrl: item.imagePreview, script: item.script })),
        }),
      });
      const data = await response.json() as { videoUrl?: string; error?: string; narration?: 'voice' | 'captions' | 'none' };
      if (!response.ok || !data.videoUrl) {
        throw new Error(data.error || 'Le rendu vidéo a échoué.');
      }
      setGeneratedVideoUrl(data.videoUrl);
      if (data.narration === 'captions') {
        setGenerationNotice('La narration OpenAI est temporairement indisponible : le script est affiché en sous-titres dans la vidéo.');
      } else if (data.narration === 'voice') {
        setGenerationNotice('La vidéo contient la narration générée à partir de vos scripts.');
      }
      onSave(makeProject('ready', data.videoUrl));
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Le rendu vidéo a échoué.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-68px)] bg-[#f6f0e6] px-5 py-8 md:px-9 md:py-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 flex items-center gap-2 text-xs text-[#938881]"><Link href="/" className="hover:text-[#d36e5e]" data-testid="link-breadcrumb-home">Accueil</Link><ChevronRight size={14} /><span className="font-semibold text-[#4d4552]">{existing ? 'Modifier la scène' : 'Nouvelle scène'}</span></div>
        <PageHeading eyebrow="Studio de création" title={existing ? 'Affiner votre scène.' : 'Construire une présence.'} description="Choisissez un visage, écrivez vos mots, puis préparez le rendu local." action={<div className="flex gap-2"><GhostButton href="/projects" testid="button-cancel-create">Annuler</GhostButton><GhostButton onClick={() => saveDraft()} testid="button-save-draft" icon={isSaving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}>{isSaving ? 'Sauvegarde…' : 'Sauvegarder'}</GhostButton></div>} />

        {generationQueued && (
          <div className="reveal mt-8 flex flex-col gap-4 rounded-2xl border border-[#ead69f] bg-[#fff4ce] p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="status-generation-queued">
            <div className="flex items-start gap-3"><div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f5c889] text-[#5a482d]"><Clock3 size={16} /></div><div><p className="text-sm font-bold text-[#5a482d]">Aucune vidéo n’a encore été produite</p><p className="mt-1 text-xs leading-relaxed text-[#806d4c]">Votre scène est conservée. Lancez un rendu local pour créer le fichier vidéo.</p></div></div>
            <GhostButton onClick={() => setGenerationQueued(false)} testid="button-dismiss-queued" icon={<X size={15} />}>Fermer</GhostButton>
          </div>
        )}

        {generationError && (
          <div className="reveal mt-8 flex items-start gap-3 rounded-2xl border border-[#f0c4bd] bg-[#fff0ed] p-4 text-sm text-[#9b4d48]" role="alert" data-testid="status-generation-error">
            <Info size={17} className="mt-0.5 shrink-0" />
            <p>{generationError}</p>
          </div>
        )}

        <div className="mt-9 grid gap-6 lg:grid-cols-[1.18fr_.82fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-[#e3d8ca] bg-[#fbf7f0] p-5 sm:p-7" data-testid="section-avatar-script">
              <div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d36e5e]">01 · Matière première</p><h2 className="mt-2 font-[var(--app-font-serif)] text-2xl font-semibold tracking-[-0.035em]">Votre avatar parle.</h2></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f9dfd3] text-[#d36e5e]"><ImageIcon size={18} /></div></div>
              <div className="mt-6 grid gap-5 sm:grid-cols-[.82fr_1.18fr]">
                <div>
                  <div className="avatar-sheen relative aspect-[4/5] overflow-hidden rounded-2xl border border-[#e2d6c9] bg-[#e8d9d0]"><AvatarPreview project={{ id: 'create-preview', name, avatarPreview }} /><div className="absolute bottom-3 right-3 rounded-lg bg-[#292538]/80 px-2 py-1 text-[10px] font-semibold text-[#fff7ec]">{format}</div></div>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="hidden" data-testid="input-avatar-file" />
                  <div className="mt-3 flex gap-2"><button onClick={() => fileInputRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#dbcec0] bg-[#f7f0e7] px-3 py-2.5 text-xs font-bold text-[#5e5662] hover:bg-[#eee6dc]" data-testid="button-upload-avatar"><Upload size={15} /> {avatarPreview ? 'Changer' : 'Importer'}</button>{avatarPreview && <button onClick={() => { setAvatarPreview(undefined); setAvatarName(undefined); }} className="rounded-xl border border-[#f0c4bd] px-3 text-[#c95c53] hover:bg-[#fff0ed]" aria-label="Retirer l’avatar" data-testid="button-remove-avatar"><X size={16} /></button>}</div>
                  {avatarName && <p className="mt-2 truncate text-[10px] text-[#958982]" title={avatarName}>{avatarName}</p>}
                  <p className="mt-2 text-[10px] leading-relaxed text-[#9a9088]">PNG, JPG ou WebP · visage net recommandé</p>
                </div>
                <div className="space-y-4">
                  <label className="block"><span className="mb-2 block text-xs font-bold text-[#514955]">Nom du projet</span><input value={name} onChange={(event) => setName(event.target.value)} className="field" data-testid="input-project-name" /></label>
                  <label className="block"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-[#514955]">Script de la scène</span><span className="text-[10px] font-medium text-[#a0968d]">{script.length}/800</span></div><textarea value={script} maxLength={800} onChange={(event) => setScript(event.target.value)} placeholder="Écrivez les mots que votre avatar prononcera…" className="field min-h-[164px] resize-none leading-relaxed" data-testid="input-script" /></label>
                  <div className="flex items-start gap-2 text-[11px] leading-relaxed text-[#897e76]"><Info size={14} className="mt-0.5 shrink-0 text-[#d36e5e]" /> Un texte de 15 à 45 secondes donne le mouvement le plus naturel.</div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#e3d8ca] bg-[#fbf7f0] p-5 sm:p-7" data-testid="section-scenes">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d36e5e]">02 · Séquence</p><h2 className="mt-2 font-[var(--app-font-serif)] text-2xl font-semibold tracking-[-0.035em]">Ajoutez vos scènes.</h2><p className="mt-2 max-w-lg text-xs leading-relaxed text-[#857a72]">Chaque photo devient une scène. Ajoutez jusqu’à 7 photos supplémentaires et écrivez le texte qui sera lu pendant chacune.</p></div>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dcefeb] text-[#4c887d]"><Plus size={18} /></div>
              </div>
              <input ref={sceneFilesInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleAdditionalUploads} className="hidden" data-testid="input-scene-files" />
              <button onClick={() => sceneFilesInputRef.current?.click()} disabled={additionalScenes.length >= 7} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#cbbcad] bg-[#f7f0e7] px-4 py-3 text-xs font-bold text-[#665c63] hover:bg-[#eee6dc] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-add-scenes"><Plus size={16} /> Ajouter plusieurs photos</button>
              {additionalScenes.length > 0 && (
                <div className="mt-5 space-y-4">
                  {additionalScenes.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-[#e5d9cb] bg-[#f7f0e7] p-3" data-testid={`card-scene-${index + 2}`}>
                      <div className="flex gap-3">
                        <img src={item.imagePreview} alt={`Scène ${index + 2}`} className="h-20 w-24 shrink-0 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2"><p className="truncate text-xs font-bold text-[#514955]" title={item.imageName}>{index + 2}. {item.imageName}</p><button onClick={() => setAdditionalScenes((current) => current.filter((sceneItem) => sceneItem.id !== item.id))} className="rounded-lg p-1 text-[#a2978d] hover:bg-[#eee0d5] hover:text-[#ca5f53]" aria-label={`Supprimer la scène ${index + 2}`} data-testid={`button-remove-scene-${index + 2}`}><Trash2 size={14} /></button></div>
                          <textarea value={item.script} maxLength={800} onChange={(event) => updateAdditionalScene(item.id, { script: event.target.value })} placeholder="Script de cette scène…" className="field mt-2 min-h-[62px] resize-none text-xs leading-relaxed" data-testid={`input-scene-script-${index + 2}`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-4 text-[10px] leading-relaxed text-[#9a9088]">{additionalScenes.length + (avatarPreview ? 1 : 0)} scène{additionalScenes.length + (avatarPreview ? 1 : 0) > 1 ? 's' : ''} prête{additionalScenes.length + (avatarPreview ? 1 : 0) > 1 ? 's' : ''} · les images sont réduites pour rester légères dans votre projet.</p>
            </section>

            <section className="rounded-3xl border border-[#e3d8ca] bg-[#fbf7f0] p-5 sm:p-7" data-testid="section-scene-settings">
              <div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d36e5e]">03 · Mise en scène</p><h2 className="mt-2 font-[var(--app-font-serif)] text-2xl font-semibold tracking-[-0.035em]">Le cadre donne le ton.</h2></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#dcefeb] text-[#4c887d]"><MonitorPlay size={18} /></div></div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-bold text-[#514955]">Décor</span><select value={scene} onChange={(event) => setScene(event.target.value)} className="field" data-testid="select-scene"><option value="portrait">Portrait neutre</option><option value="studio">Studio doux</option><option value="gradient">Fond couleur</option></select></label><label className="block"><span className="mb-2 block text-xs font-bold text-[#514955]">Format de sortie</span><select value={format} onChange={(event) => setFormat(event.target.value)} className="field" data-testid="select-format"><option value="16:9">Paysage · 16:9</option><option value="9:16">Vertical · 9:16</option><option value="1:1">Carré · 1:1</option></select></label></div>
              <div className="mt-5 grid grid-cols-3 gap-2">{['16:9', '9:16', '1:1'].map((ratio) => <button key={ratio} onClick={() => setFormat(ratio)} className={cn('rounded-xl border px-3 py-3 text-center text-xs font-bold transition-colors', format === ratio ? 'border-[#f48770] bg-[#fff0ea] text-[#be5e55]' : 'border-[#e3d8ca] text-[#857b74] hover:bg-[#f4ede4]')} data-testid={`button-format-${ratio.replace(':', '-')}`}>{ratio}<span className="mt-1 block text-[10px] font-medium opacity-70">{ratio === '16:9' ? 'YouTube' : ratio === '9:16' ? 'Shorts' : 'Social'}</span></button>)}</div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-[#e3d8ca] bg-[#fbf7f0] p-5 sm:p-7" data-testid="section-voice-settings">
              <div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d36e5e]">04 · Voix</p><h2 className="mt-2 font-[var(--app-font-serif)] text-2xl font-semibold tracking-[-0.035em]">Une présence singulière.</h2></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f8e8b9] text-[#9a741b]"><Mic2 size={18} /></div></div>
              <label className="mt-6 block"><span className="mb-2 block text-xs font-bold text-[#514955]">Voix de narration</span><select value={voice} onChange={(event) => setVoice(event.target.value)} className="field" data-testid="select-voice"><option>Claire — français</option><option>Thomas — français</option><option>Amélie — français</option><option>Mark — English</option></select></label>
              <div className="mt-5 rounded-2xl bg-[#f4ede4] p-4"><div className="flex items-center gap-3"><button className="grid h-9 w-9 place-items-center rounded-full bg-[#292538] text-[#fff7ec] transition-transform hover:scale-105" aria-label="Préécouter la voix" data-testid="button-preview-voice"><Play size={14} fill="currentColor" /></button><div className="flex-1"><div className="flex items-center justify-between text-[10px] font-semibold text-[#81776f]"><span>Aperçu de la voix</span><span>0:12</span></div><div className="mt-2 flex h-4 items-center gap-1">{Array.from({ length: 27 }).map((_, i) => <span key={i} className={cn('w-1 rounded-full bg-[#d48574]', i % 4 === 0 ? 'h-2' : i % 3 === 0 ? 'h-4' : 'h-3')} />)}</div></div><Volume2 size={16} className="text-[#8d8179]" /></div></div>
              <label className="mt-6 block"><div className="mb-2 flex justify-between text-xs font-bold text-[#514955]"><span>Rythme</span><span className="font-medium text-[#988d84]">{speed.toFixed(2)}×</span></div><input type="range" min="0.75" max="1.25" step="0.05" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="w-full accent-[#e57868]" data-testid="input-voice-speed" /><div className="mt-1 flex justify-between text-[10px] text-[#a09790]"><span>Posé</span><span>Naturel</span><span>Énergique</span></div></label>
            </section>
            <section className="rounded-3xl bg-[#292538] p-5 text-[#f8f0e5] shadow-[0_14px_30px_-20px_rgba(41,37,56,.8)] sm:p-7" data-testid="section-generate">
              <div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f5c889]">05 · Prêt à lancer</p><h2 className="mt-2 font-[var(--app-font-serif)] text-2xl font-semibold tracking-[-0.035em]">Générer la vidéo.</h2></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#454055] text-[#f48770]"><Sparkles size={18} /></div></div>
              <div className="mt-6 space-y-3 border-y border-[#484153] py-4 text-xs"><div className="flex items-center justify-between"><span className="text-[#aaa1ac]">Scènes</span><span className={cn('font-semibold', buildScenes().length ? 'text-[#a7d8cc]' : 'text-[#f5c889]')}>{buildScenes().length ? `${buildScenes().length} prête${buildScenes().length > 1 ? 's' : ''}` : 'À ajouter'}</span></div><div className="flex items-center justify-between"><span className="text-[#aaa1ac]">Scripts</span><span className={cn('font-semibold', buildScenes().some((item) => item.script.trim()) ? 'text-[#a7d8cc]' : 'text-[#f5c889]')}>{buildScenes().filter((item) => item.script.trim()).length}/{buildScenes().length}</span></div><div className="flex items-center justify-between"><span className="text-[#aaa1ac]">Rendu</span><span className="font-semibold text-[#a7d8cc]">MP4 + voix ou sous-titres</span></div></div>
              <button onClick={generateVideo} disabled={isGenerating} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f48770] px-4 py-3 text-sm font-bold text-[#292538] shadow-[0_3px_0_#be5c59] transition-all hover:-translate-y-0.5 hover:bg-[#fa987f] active:translate-y-0 active:shadow-none disabled:cursor-wait disabled:opacity-70" data-testid="button-generate-video">{isGenerating ? <LoaderCircle className="animate-spin" size={17} /> : <WandSparkles size={17} />} {isGenerating ? 'Génération en cours…' : generatedVideoUrl ? 'Régénérer la vidéo' : 'Générer la vidéo'}</button>
              <p className="mt-3 text-center text-[10px] leading-relaxed text-[#9f96a2]">Les photos seront assemblées dans l’ordre, avec une narration pour chaque script.</p>
              {generatedVideoUrl && (
                <div className="mt-5 border-t border-[#484153] pt-5" data-testid="generated-video-result">
                  <video src={generatedVideoUrl} controls className="aspect-video w-full rounded-xl bg-[#191725]" data-testid="video-generated" />
                  {generationNotice && <p className="mt-3 text-center text-[10px] leading-relaxed text-[#f5c889]" data-testid="text-generation-notice">{generationNotice}</p>}
                  <a href={generatedVideoUrl} download={`${name.trim() || 'mirlift-video'}.mp4`} className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-[#625a70] px-3 py-2.5 text-xs font-bold text-[#f8f0e5] hover:bg-[#3a344b]" data-testid="link-download-video"><ArrowUpRight size={14} /> Télécharger la vidéo</a>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectsPage({ projects, onDelete }: { projects: Project[]; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | ProjectStatus>('all');
  const filtered = useMemo(() => projects.filter((project) => (filter === 'all' || project.status === filter) && project.name.toLowerCase().includes(query.toLowerCase())), [projects, query, filter]);
  return (
    <div className="min-h-[calc(100dvh-68px)] bg-[#f6f0e6] px-5 py-8 md:px-9 md:py-11">
      <div className="mx-auto max-w-[1240px]">
        <PageHeading eyebrow="Bibliothèque" title="Vos projets, au même endroit." description="Retrouvez vos scènes, reprenez un brouillon ou préparez une nouvelle idée." action={<PrimaryButton href="/create" testid="button-create-from-projects" icon={<Plus size={18} />}>Nouveau projet</PrimaryButton>} />
        <div className="mt-10 flex flex-col gap-3 border-b border-[#ded3c5] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1"><Search size={17} className="absolute left-3.5 top-3 text-[#9d9289]" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un projet…" className="field pl-10" data-testid="input-search-projects" /></div>
          <div className="flex items-center gap-2"><SlidersHorizontal size={16} className="text-[#968b82]" /><select value={filter} onChange={(event) => setFilter(event.target.value as 'all' | ProjectStatus)} className="field w-auto min-w-[150px]" aria-label="Filtrer les projets" data-testid="select-project-filter"><option value="all">Tous les projets</option><option value="draft">Brouillons</option><option value="queued">En attente</option><option value="ready">Prêts</option></select></div>
        </div>
        <div className="mt-7 flex items-center justify-between"><p className="text-xs font-semibold text-[#817770]">{filtered.length} projet{filtered.length > 1 ? 's' : ''}</p><p className="text-[11px] text-[#9a9088]">Dernière modification</p></div>
        {filtered.length > 0 ? <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((project, index) => <ProjectCard key={project.id} project={project} index={index} onDelete={onDelete} />)}</div> : <div className="mt-6"><EmptyProjects /></div>}
      </div>
    </div>
  );
}

function SettingsPage() {
  const [settings, setSettings] = useState(readSettings);
  const [saved, setSaved] = useState(false);
  const [openAiConfigured, setOpenAiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    fetch(`${basePath}api/openai/status`)
      .then((response) => (response.ok ? response.json() as Promise<{ configured: boolean }> : Promise.reject(new Error('status unavailable'))))
      .then((data) => { if (active) setOpenAiConfigured(data.configured); })
      .catch(() => { if (active) setOpenAiConfigured(null); });
    return () => { active = false; };
  }, []);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };
  return (
    <div className="min-h-[calc(100dvh-68px)] bg-[#f6f0e6] px-5 py-8 md:px-9 md:py-11">
      <div className="mx-auto max-w-[1000px]">
        <PageHeading eyebrow="Configuration locale" title="Le studio, à votre façon." description="Ces réglages sont enregistrés uniquement dans ce navigateur." action={saved ? <div className="flex items-center gap-2 rounded-xl bg-[#dcefeb] px-3.5 py-2.5 text-sm font-bold text-[#477c72]" data-testid="status-settings-saved"><Check size={16} /> Enregistré</div> : undefined} />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <section className="rounded-3xl border border-[#e3d8ca] bg-[#fbf7f0] p-5 sm:p-7" data-testid="section-settings-preferences">
            <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f9dfd3] text-[#d36e5e]"><Languages size={19} /></div><div><h2 className="font-[var(--app-font-serif)] text-2xl font-semibold tracking-[-0.035em]">Préférences</h2><p className="mt-1 text-xs text-[#8c8179]">La langue et les formats utilisés par défaut.</p></div></div>
            <div className="mt-7 space-y-5"><label className="block"><span className="mb-2 block text-xs font-bold text-[#514955]">Langue de l’interface</span><select value={settings.language} onChange={(event) => update({ language: event.target.value })} className="field" data-testid="select-language"><option value="fr">Français</option><option value="en">English</option></select></label><label className="block"><span className="mb-2 block text-xs font-bold text-[#514955]">Format vidéo par défaut</span><select value={settings.format} onChange={(event) => update({ format: event.target.value })} className="field" data-testid="select-default-format"><option value="mp4">MP4 · H.264</option><option value="webm">WebM</option></select></label><div className="flex items-center justify-between rounded-2xl bg-[#f4ede4] p-4"><div><p className="text-sm font-bold text-[#514955]">Réduire les animations</p><p className="mt-1 text-xs text-[#8e837b]">Utile pour une machine plus légère.</p></div><button role="switch" aria-checked={settings.reducedMotion} onClick={() => update({ reducedMotion: !settings.reducedMotion })} className={cn('relative h-6 w-11 rounded-full transition-colors', settings.reducedMotion ? 'bg-[#4d8a7d]' : 'bg-[#cfc3b8]')} data-testid="switch-reduced-motion"><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-[#fffaf3] transition-transform', settings.reducedMotion ? 'left-6' : 'left-1')} /></button></div></div>
          </section>
          <section className="rounded-3xl border border-[#e3d8ca] bg-[#fbf7f0] p-5 sm:p-7" data-testid="section-settings-connection">
            <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f8e8b9] text-[#9a741b]"><KeyRound size={19} /></div><div><h2 className="font-[var(--app-font-serif)] text-2xl font-semibold tracking-[-0.035em]">Clé OpenAI</h2><p className="mt-1 text-xs text-[#8c8179]">Pour l’écriture assistée et la narration IA.</p></div></div>
            <div className="mt-7 rounded-2xl border border-[#eadfce] bg-[#f7f0e7] p-4" data-testid="card-openai-key">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#514955]"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#292538] text-[#f5c889]"><Sparkles size={14} /></span> OpenAI API</div>
                <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold', openAiConfigured ? 'bg-[#d9f0eb] text-[#256d64]' : 'bg-[#fff0c2] text-[#805f1c]')} data-testid="status-openai-key">{openAiConfigured === null ? 'Vérification…' : openAiConfigured ? 'Configurée' : 'Non configurée'}</span>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-[#827770]">La clé est gérée dans les Secrets Replit. Elle n’est jamais enregistrée dans votre navigateur, affichée à l’écran ou incluse dans le code.</p>
              <div className="mt-4 rounded-xl border border-[#ded1c1] bg-[#fbf7f0] p-3 text-[11px] leading-relaxed text-[#746961]">
                <p className="font-bold text-[#514955]">Nom du secret à utiliser</p>
                <code className="mt-1 block rounded-lg bg-[#292538] px-2.5 py-2 font-mono text-[#f5c889]" data-testid="text-openai-secret-name">OPENAI_API_KEY</code>
              </div>
              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d9cdbf] bg-[#fbf7f0] px-3 py-2.5 text-xs font-bold text-[#6d626a] hover:bg-[#eee7dd]" onClick={() => window.alert('Ouvrez le panneau Secrets de Replit, ajoutez ou remplacez OPENAI_API_KEY, puis redémarrez Preview. La clé ne doit pas être collée dans ce navigateur.')} data-testid="button-manage-openai-key"><KeyRound size={15} /> Ajouter ou remplacer la clé</button>
            </div>
            <div className="mt-6 flex items-start gap-2 text-[11px] leading-relaxed text-[#8c8179]"><Info size={14} className="mt-0.5 shrink-0 text-[#d36e5e]" /> Après une modification, redémarrez Preview pour que le serveur la recharge. Une clé OpenAI peut entraîner des frais selon votre compte.</div>
          </section>
        </div>
        <div className="mt-6 rounded-2xl border border-[#e4dacc] bg-[#e9f3ef] px-5 py-4 text-xs text-[#477c72]"><div className="flex items-center gap-2 font-bold"><CheckCircle2 size={16} /> Vos préférences sont locales</div><p className="mt-1 pl-6 text-[#5a847c]">Les données de studio sont conservées dans le stockage de votre navigateur.</p></div>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return <div className="grid min-h-[calc(100dvh-68px)] place-items-center bg-[#f6f0e6] px-6 text-center"><div><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#f9dfd3] text-[#d36e5e]"><Aperture size={28} /></div><h1 className="mt-6 font-[var(--app-font-serif)] text-4xl font-semibold">Cette scène n’existe pas.</h1><p className="mt-3 text-sm text-[#817770]">Revenez à l’atelier pour continuer.</p><PrimaryButton href="/" testid="button-back-home">Retour à l’accueil</PrimaryButton></div></div>;
}

function RouterContent({ projects, onSave, onDelete }: { projects: Project[]; onSave: (project: Project) => void; onDelete: (id: string) => void }) {
  return <Switch><Route path="/" component={() => <Dashboard projects={projects} onDelete={onDelete} />} /><Route path="/create/:id" component={() => <CreatePage projects={projects} onSave={onSave} />} /><Route path="/create" component={() => <CreatePage projects={projects} onSave={onSave} />} /><Route path="/projects" component={() => <ProjectsPage projects={projects} onDelete={onDelete} />} /><Route path="/settings" component={SettingsPage} /><Route component={NotFoundPage} /></Switch>;
}

function App() {
  const [projects, setProjects] = useState<Project[]>(readProjects);
  const saveProjects = (next: Project[]) => { setProjects(next); localStorage.setItem(PROJECTS_KEY, JSON.stringify(next)); };
  const handleSave = (project: Project) => saveProjects([project, ...projects.filter((item) => item.id !== project.id)]);
  const handleDelete = (id: string) => { if (window.confirm('Supprimer ce projet et son brouillon ?')) saveProjects(projects.filter((project) => project.id !== id)); };
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppShell><RouterContent projects={projects} onSave={handleSave} onDelete={handleDelete} /></AppShell></WouterRouter>;
}

export default App;