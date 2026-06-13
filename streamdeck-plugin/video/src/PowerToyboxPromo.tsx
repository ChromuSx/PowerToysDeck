import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const COLORS = {
  bg: "#07111f",
  bg2: "#0c1627",
  panel: "#121a27",
  panel2: "#1a2534",
  panel3: "#222d3d",
  stroke: "rgba(255,255,255,0.12)",
  strokeStrong: "rgba(126, 222, 255, 0.36)",
  cyan: "#18d8ff",
  blue: "#2888ff",
  purple: "#8b5cff",
  green: "#4cd964",
  yellow: "#ffd23f",
  orange: "#ff7a1a",
  text: "#f2f8ff",
  muted: "#9fb1c7",
  dim: "#70839b",
  white: "#ffffff",
};

const FONT =
  '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif';

const FPS = 60;

type CommandKind = "utility" | "hotkey" | "run" | "cmdpal" | "keyboard";

type CommandItem = {
  id: string;
  title: string;
  shortTitle: string;
  group: string;
  source: string;
  meta: string;
  badge: string;
  kind: CommandKind;
  details: Array<[string, string]>;
  selected?: boolean;
};

const quickCommands: CommandItem[] = [
  {
    id: "color-picker",
    title: "Color Picker",
    shortTitle: "Color",
    group: "Quick Access",
    source: "PowerToys event",
    meta: "Quick Access - PowerToys event",
    badge: "Utility",
    kind: "utility",
    selected: true,
    details: [
      ["Type", "Utility"],
      ["Behavior", "Signals the matching PowerToys utility."],
    ],
  },
  {
    id: "fancyzones",
    title: "FancyZones Editor",
    shortTitle: "Zones",
    group: "PowerToys Hotkeys",
    source: "FancyZones",
    meta: "PowerToys Hotkeys - Win+Shift+`",
    badge: "Hotkey",
    kind: "hotkey",
    details: [
      ["Type", "Hotkey"],
      ["Shortcut", "Win+Shift+`"],
    ],
  },
  {
    id: "text-extractor",
    title: "Text Extractor",
    shortTitle: "Text",
    group: "PowerToys Hotkeys",
    source: "Text Extractor",
    meta: "PowerToys Hotkeys - Win+Shift+T",
    badge: "Hotkey",
    kind: "hotkey",
    details: [
      ["Type", "Hotkey"],
      ["Shortcut", "Win+Shift+T"],
    ],
  },
  {
    id: "mouse-utils",
    title: "Find My Mouse",
    shortTitle: "Mouse",
    group: "Quick Access",
    source: "Mouse Utilities",
    meta: "Quick Access - PowerToys event",
    badge: "Utility",
    kind: "utility",
    details: [["Type", "Utility"]],
  },
];

const runCommands: CommandItem[] = [
  {
    id: "run-shell",
    title: "Shell command",
    shortTitle: "Shell",
    group: "PowerToys Run",
    source: "Run plugin",
    meta: 'PowerToys Run - Alias ">"',
    badge: "Run alias",
    kind: "run",
    selected: true,
    details: [
      ["Type", "Run alias"],
      ["Alias", ">"],
      ["Behavior", 'Opens PowerToys Run, clears the query, then types ">".'],
    ],
  },
  {
    id: "run-calc",
    title: "Calculator",
    shortTitle: "Calc",
    group: "PowerToys Run",
    source: "Run plugin",
    meta: 'PowerToys Run - Alias "="',
    badge: "Run alias",
    kind: "run",
    details: [
      ["Type", "Run alias"],
      ["Alias", "="],
    ],
  },
  {
    id: "run-windows-search",
    title: "Windows Search",
    shortTitle: "Search",
    group: "PowerToys Run",
    source: "Run plugin",
    meta: 'PowerToys Run - Alias "?"',
    badge: "Run alias",
    kind: "run",
    details: [
      ["Type", "Run alias"],
      ["Alias", "?"],
    ],
  },
  {
    id: "run-registry",
    title: "Registry",
    shortTitle: "Reg",
    group: "PowerToys Run",
    source: "Run plugin",
    meta: 'PowerToys Run - Alias ":"',
    badge: "Run alias",
    kind: "run",
    details: [
      ["Type", "Run alias"],
      ["Alias", ":"],
    ],
  },
];

const keyboardCommands: CommandItem[] = [
  {
    id: "cmdpal-pinned",
    title: "Command Palette pinned item",
    shortTitle: "CmdPal",
    group: "Command Palette",
    source: "Pinned command",
    meta: "Command Palette - Alias dev",
    badge: "CmdPal",
    kind: "cmdpal",
    selected: true,
    details: [
      ["Type", "CmdPal"],
      ["Alias", "dev"],
      ["Behavior", 'Opens Command Palette, clears the query, then types "dev".'],
    ],
  },
  {
    id: "keyboard-remap",
    title: "Caps Lock to Ctrl",
    shortTitle: "Caps",
    group: "Keyboard Manager",
    source: "default.json",
    meta: "Keyboard Manager - Mapping",
    badge: "Mapping",
    kind: "keyboard",
    details: [
      ["Type", "Mapping"],
      ["Source", "Keyboard Manager default.json"],
    ],
  },
  {
    id: "keyboard-shortcut",
    title: "Launch Terminal shortcut",
    shortTitle: "Terminal",
    group: "Keyboard Manager",
    source: "default.json",
    meta: "Keyboard Manager - Win+Alt+T",
    badge: "Mapping",
    kind: "keyboard",
    details: [
      ["Type", "Mapping"],
      ["Shortcut", "Win+Alt+T"],
    ],
  },
  {
    id: "cmdpal-alias",
    title: "Open developer folder",
    shortTitle: "Dev",
    group: "Command Palette",
    source: "Command alias",
    meta: "Command Palette - Alias repo",
    badge: "CmdPal",
    kind: "cmdpal",
    details: [
      ["Type", "CmdPal alias"],
      ["Alias", "repo"],
    ],
  },
];

const filters = [
  ["All", "28"],
  ["Quick Access", "7"],
  ["Hotkeys", "9"],
  ["Run", "6"],
  ["CmdPal", "4"],
  ["Keyboard", "2"],
];

const kindColor = (kind: CommandKind): string => {
  if (kind === "utility") return COLORS.cyan;
  if (kind === "hotkey") return COLORS.purple;
  if (kind === "run") return COLORS.orange;
  if (kind === "cmdpal") return COLORS.blue;
  return COLORS.green;
};

const RefreshIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path
      d="M36 17a14 14 0 1 0 2 13"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M35 7v11h-11"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 12;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.bg}, ${COLORS.bg2})`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          transform: `translate3d(${drift}px, ${-drift}px, 0)`,
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), transparent 86%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -180,
          right: -180,
          top: 120,
          height: 280,
          background:
            "linear-gradient(90deg, rgba(24,216,255,0), rgba(24,216,255,0.18), rgba(139,92,255,0.14), rgba(255,122,26,0))",
          transform: "rotate(-8deg)",
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 280,
          background: "linear-gradient(180deg, rgba(7,17,31,0), rgba(7,17,31,0.9))",
        }}
      />
    </AbsoluteFill>
  );
};

const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = COLORS.cyan,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      height: 42,
      padding: "0 18px",
      borderRadius: 999,
      border: `1px solid ${color}66`,
      background: `${color}18`,
      color,
      fontSize: 18,
      fontWeight: 850,
    }}
  >
    <span
      style={{
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 22px ${color}`,
      }}
    />
    {children}
  </div>
);

const HeroText: React.FC<{
  title: React.ReactNode;
  subtitle: string;
  badge?: string;
  maxWidth?: number;
}> = ({ title, subtitle, badge = "PowerToys commands for Stream Deck", maxWidth = 760 }) => (
  <div style={{ maxWidth, fontFamily: FONT }}>
    <Badge>{badge}</Badge>
    <div
      style={{
        marginTop: 24,
        color: COLORS.text,
        fontSize: 78,
        fontWeight: 950,
        lineHeight: 0.98,
        letterSpacing: 0,
      }}
    >
      {title}
    </div>
    <div
      style={{
        marginTop: 24,
        color: COLORS.muted,
        fontSize: 29,
        lineHeight: 1.25,
        fontWeight: 680,
      }}
    >
      {subtitle}
    </div>
  </div>
);

const MiniIcon: React.FC<{ kind: CommandKind; label?: string; size?: number }> = ({
  kind,
  label,
  size = 38,
}) => {
  const color = kindColor(kind);
  const text =
    label ??
    (kind === "utility" ? "PT" : kind === "hotkey" ? "HK" : kind === "run" ? "RUN" : kind === "cmdpal" ? "CP" : "KB");
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(7, size * 0.18),
        display: "grid",
        placeItems: "center",
        background: `linear-gradient(180deg, ${color}, ${color}88)`,
        boxShadow: `0 12px 26px ${color}30`,
        color: "#06111f",
        fontSize: size < 34 ? 9 : 11,
        fontWeight: 950,
      }}
    >
      {text}
    </div>
  );
};

const Key: React.FC<{
  active?: boolean;
  label?: string;
  image?: string;
  empty?: boolean;
  accent?: string;
}> = ({ active = false, label, image, empty = false, accent = COLORS.cyan }) => {
  return (
    <div
      style={{
        width: 92,
        height: 92,
        borderRadius: 18,
        background: empty ? "linear-gradient(180deg, #252d39, #111822)" : "linear-gradient(180deg, #101923, #060a10)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 0 ${active ? 38 : 0}px ${accent}`,
        display: "grid",
        placeItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {image ? <Img src={staticFile(image)} style={{ width: 70, height: 70, objectFit: "contain" }} /> : null}
      {!image && !empty ? <MiniIcon kind="utility" size={54} /> : null}
      {label ? (
        <div
          style={{
            position: "absolute",
            left: 4,
            right: 4,
            bottom: 7,
            color: "#ecfbff",
            fontSize: 9,
            fontWeight: 950,
            textAlign: "center",
            textShadow: "0 1px 5px #000",
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};

const StreamDeck: React.FC<{
  activeIndex?: number;
  changed?: boolean;
  scale?: number;
}> = ({ activeIndex = 0, changed = false, scale = 1 }) => {
  const labels = ["Color", "Run", "CmdPal", "Text", "Zones"];
  return (
    <div
      style={{
        width: 650,
        padding: 34,
        borderRadius: 42,
        background: "linear-gradient(145deg, #303a49, #0a0f18 68%)",
        boxShadow: "0 44px 96px rgba(0,0,0,0.48), inset 0 2px 0 rgba(255,255,255,0.13)",
        border: "1px solid rgba(255,255,255,0.12)",
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 92px)",
          gridAutoRows: "92px",
          gap: 20,
          justifyContent: "center",
        }}
      >
        {Array.from({ length: 15 }).map((_, index) => (
          <Key
            key={index}
            active={index === activeIndex}
            image={index === 0 ? "keys/key-idle.png" : undefined}
            label={index < labels.length ? labels[index] : undefined}
            empty={index >= labels.length}
            accent={changed && index === activeIndex ? COLORS.green : COLORS.cyan}
          />
        ))}
      </div>
    </div>
  );
};

const CommandRow: React.FC<{ item: CommandItem; forceSelected?: boolean }> = ({
  item,
  forceSelected,
}) => {
  const selected = forceSelected ?? item.selected;
  const color = kindColor(item.kind);
  return (
    <div
      style={{
        minHeight: 62,
        display: "grid",
        gridTemplateColumns: "38px 1fr auto",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderBottom: "1px solid #3a3a3a",
        background: selected ? "#12384a" : "transparent",
        boxShadow: selected ? `inset 4px 0 0 ${COLORS.cyan}` : undefined,
      }}
    >
      <MiniIcon kind={item.kind} size={34} />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: "#f3f3f3",
            fontSize: 15,
            fontWeight: 760,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.title}
        </div>
        <div
          style={{
            marginTop: 3,
            color: "#b8b8b8",
            fontSize: 13,
            fontWeight: 560,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.meta}
        </div>
      </div>
      <div
        style={{
          maxWidth: 100,
          padding: "5px 8px",
          borderRadius: 5,
          color: "#f2fbff",
          background: `${color}26`,
          border: `1px solid ${color}66`,
          fontSize: 12,
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}
      >
        {item.badge}
      </div>
    </div>
  );
};

const PropertyInspector: React.FC<{
  items?: CommandItem[];
  selectedId?: string;
  activeFilter?: string;
  search?: string;
  title?: string;
  height?: number;
}> = ({
  items = quickCommands,
  selectedId,
  activeFilter = "All",
  search = "Search PowerToys",
  title = "Color",
  height = 860,
}) => {
  const selected = items.find((item) => item.id === selectedId) ?? items.find((item) => item.selected) ?? items[0];
  return (
    <div
      style={{
        width: 430,
        height,
        borderRadius: 18,
        background: "#202020",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 34px 92px rgba(0,0,0,0.38)",
        overflow: "hidden",
        fontFamily: FONT,
      }}
    >
      <div style={{ padding: "18px 20px 0 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, paddingBottom: 13 }}>
          <Img src={staticFile("plugin-icon.png")} style={{ width: 38, height: 38, objectFit: "contain" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#f3f3f3", fontSize: 17, fontWeight: 720 }}>Power Toybox Deck</div>
            <div style={{ marginTop: 2, color: "#b8b8b8", fontSize: 12, fontWeight: 560 }}>
              PowerToys v0.100.0 - 28 synced
            </div>
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 5,
              display: "grid",
              placeItems: "center",
              background: "#2b2b2b",
              border: "1px solid #474747",
              color: "#f3f3f3",
              fontSize: 18,
            }}
          >
            <RefreshIcon size={18} />
          </div>
        </div>
        <div
          style={{
            border: "1px solid #3a3a3a",
            borderRadius: 7,
            overflow: "hidden",
            background: "#2b2b2b",
            marginBottom: 11,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "38px 1fr",
              gap: 10,
              alignItems: "center",
              padding: 11,
              background: "#303030",
              borderBottom: "1px solid #3a3a3a",
            }}
          >
            <MiniIcon kind={selected.kind} size={32} />
            <div>
              <div style={{ color: "#f3f3f3", fontSize: 14, fontWeight: 720 }}>{selected.title}</div>
              <div style={{ marginTop: 2, color: "#b8b8b8", fontSize: 12 }}>
                {selected.group} - {selected.source}
              </div>
            </div>
          </div>
          <div style={{ padding: 11, display: "grid", gap: 9 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f3f3f3", fontSize: 13 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: COLORS.cyan,
                  boxShadow: `0 0 14px ${COLORS.cyan}`,
                }}
              />
              Show title
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "76px 1fr 54px", gap: 8, alignItems: "center" }}>
              <div style={{ color: "#8f8f8f", fontSize: 12 }}>Title</div>
              <div
                style={{
                  height: 32,
                  borderRadius: 5,
                  background: "#242424",
                  border: "1px solid #474747",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 9px",
                  color: "#f3f3f3",
                  fontSize: 13,
                }}
              >
                {title || selected.shortTitle}
              </div>
              <div
                style={{
                  height: 32,
                  borderRadius: 5,
                  border: "1px solid #474747",
                  display: "grid",
                  placeItems: "center",
                  color: "#b8b8b8",
                  fontSize: 12,
                }}
              >
                Auto
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            height: 36,
            borderRadius: 5,
            border: "1px solid #474747",
            background: "#2d2d2d",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#8f8f8f",
            padding: "0 11px",
            fontSize: 13,
            marginBottom: 11,
          }}
        >
          {search}
          <span>/</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 11 }}>
          {filters.map(([label, count]) => (
            <div
              key={label}
              style={{
                height: 29,
                padding: "0 10px",
                borderRadius: 5,
                border: `1px solid ${label === activeFilter ? "#357a9f" : "#474747"}`,
                background: label === activeFilter ? "#07324a" : "transparent",
                color: label === activeFilter ? "#f3f3f3" : "#b8b8b8",
                display: "flex",
                alignItems: "center",
                fontSize: 12,
                fontWeight: 650,
              }}
            >
              {label} {count}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          margin: "0 20px 0 14px",
          borderRadius: 7,
          border: "1px solid #3a3a3a",
          background: "#242424",
          overflow: "hidden",
        }}
      >
        {items.map((item) => (
          <CommandRow key={item.id} item={item} forceSelected={item.id === selected.id} />
        ))}
      </div>
      <div
        style={{
          margin: "11px 20px 0 14px",
          borderRadius: 7,
          border: "1px solid #3a3a3a",
          background: "#2b2b2b",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "38px 1fr",
            gap: 10,
            alignItems: "center",
            padding: 11,
            background: "#303030",
            borderBottom: "1px solid #3a3a3a",
          }}
        >
          <MiniIcon kind={selected.kind} size={32} />
          <div>
            <div style={{ color: "#f3f3f3", fontSize: 14, fontWeight: 720 }}>Command details</div>
            <div style={{ marginTop: 2, color: "#b8b8b8", fontSize: 12 }}>
              {selected.group} - {selected.source}
            </div>
          </div>
        </div>
        <div style={{ padding: 11, display: "grid", gap: 8 }}>
          {selected.details.map(([label, value]) => (
            <div key={label} style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: 8, fontSize: 12 }}>
              <div style={{ color: "#8f8f8f" }}>{label}</div>
              <div style={{ color: "#f3f3f3", lineHeight: 1.35 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StreamDeckSetup: React.FC = () => (
  <div
    style={{
      width: 1480,
      height: 790,
      borderRadius: 28,
      overflow: "hidden",
      background: "#242424",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 38px 100px rgba(0,0,0,0.35)",
      fontFamily: FONT,
    }}
  >
    <div
      style={{
        height: 60,
        background: "#1b1b1b",
        borderBottom: "1px solid #383838",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        color: "#d8d8d8",
        fontSize: 15,
        fontWeight: 820,
      }}
    >
      <span>Stream Deck</span>
      <span style={{ color: "#999" }}>Default Profile</span>
      <span style={{ color: COLORS.cyan }}>Power Toybox Deck</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", height: 432 }}>
      <div
        style={{
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(180deg, #343434, #242424)",
        }}
      >
        <StreamDeck activeIndex={0} scale={0.82} />
      </div>
      <div
        style={{
          borderLeft: "1px solid #383838",
          padding: 20,
          background: "#2e2e2e",
          color: "#d6d6d6",
        }}
      >
        <div
          style={{
            height: 38,
            borderRadius: 7,
            background: "#202020",
            border: "1px solid #454545",
            color: "#828282",
            display: "flex",
            alignItems: "center",
            paddingLeft: 13,
            fontSize: 13,
            marginBottom: 18,
          }}
        >
          Search actions
        </div>
        <div style={{ fontSize: 13, color: "#a4a4a4", fontWeight: 850 }}>Power Toybox Deck</div>
        {["Toybox Command"].map((label) => (
          <div
            key={label}
            style={{
              marginTop: 11,
              height: 50,
              borderRadius: 8,
              background: "#0e7afe",
              border: "1px solid #2490ff",
              color: "#f4f7fb",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 12px",
              fontSize: 14,
              fontWeight: 820,
            }}
          >
            <Img src={staticFile("action-icon@2x.png")} style={{ width: 24, height: 24 }} />
            {label}
          </div>
        ))}
        <div style={{ marginTop: 22, color: "#9aa8b8", fontSize: 14, lineHeight: 1.45 }}>
          One action, configured from your current PowerToys catalog.
        </div>
      </div>
    </div>
    <div
      style={{
        height: 298,
        background: "#2d2d2d",
        borderTop: "1px solid #3f3f3f",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "0 34px",
      }}
    >
      <PropertyInspector height={252} />
      <div style={{ width: 540, color: "#d8d8d8" }}>
        <div style={{ fontSize: 42, fontWeight: 950, lineHeight: 1.02 }}>Pick the command once</div>
        <div style={{ marginTop: 16, color: "#9aa8b8", fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>
          The key stores a stable item ID. Hotkeys, aliases and titles resolve from PowerToys at runtime.
        </div>
      </div>
    </div>
  </div>
);

const SettingsSyncPanel: React.FC<{ changed?: boolean }> = ({ changed = false }) => (
  <div
    style={{
      width: 560,
      borderRadius: 24,
      background: "rgba(18,26,39,0.94)",
      border: `1px solid ${changed ? COLORS.green : COLORS.strokeStrong}`,
      boxShadow: "0 34px 92px rgba(0,0,0,0.36)",
      padding: 28,
      fontFamily: FONT,
      color: COLORS.text,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ color: COLORS.cyan, fontSize: 16, fontWeight: 850 }}>
          PowerToys settings folder
        </div>
        <div style={{ marginTop: 8, fontSize: 32, fontWeight: 950 }}>settings.json changed</div>
      </div>
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 16,
          background: changed ? COLORS.green : COLORS.cyan,
          color: "#05101d",
          display: "grid",
          placeItems: "center",
          fontSize: 30,
          fontWeight: 950,
        }}
      >
        <RefreshIcon size={30} />
      </div>
    </div>
    <div style={{ marginTop: 28, display: "grid", gap: 14 }}>
      {[
        ["Color Picker", changed ? "Win+Alt+C" : "Win+Shift+C"],
        ["PowerToys Run", "Alt+Space"],
        ["Command Palette", changed ? "Win+Alt+P" : "Win+Shift+P"],
        ["Keyboard Manager", "default.json"],
      ].map(([name, value], index) => (
        <div
          key={name}
          style={{
            height: 58,
            borderRadius: 14,
            background: index === 0 && changed ? "rgba(76,217,100,0.14)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${index === 0 && changed ? "rgba(76,217,100,0.38)" : "rgba(255,255,255,0.10)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 17px",
          }}
        >
          <span style={{ fontSize: 19, fontWeight: 850 }}>{name}</span>
          <span style={{ color: index === 0 && changed ? COLORS.green : COLORS.muted, fontSize: 18, fontWeight: 850 }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const FeatureCard: React.FC<{
  title: string;
  detail: string;
  kind: CommandKind;
}> = ({ title, detail, kind }) => {
  const color = kindColor(kind);
  return (
    <div
      style={{
        width: 312,
        minHeight: 128,
        borderRadius: 18,
        background: "rgba(255,255,255,0.075)",
        border: "1px solid rgba(255,255,255,0.14)",
        padding: 20,
        color: COLORS.text,
        boxShadow: "0 22px 50px rgba(0,0,0,0.18)",
      }}
    >
      <MiniIcon kind={kind} size={42} />
      <div style={{ marginTop: 14, fontSize: 21, fontWeight: 930 }}>{title}</div>
      <div style={{ marginTop: 8, color: COLORS.muted, fontSize: 15, fontWeight: 650, lineHeight: 1.35 }}>
        {detail}
      </div>
      <div style={{ marginTop: 14, height: 3, borderRadius: 999, background: color }} />
    </div>
  );
};

const SceneHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.85 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 86, opacity: enter }}>
        <Img
          src={staticFile("plugin-icon-large.png")}
          style={{
            width: 360,
            height: 360,
            objectFit: "contain",
            transform: `translateY(${(1 - enter) * 26}px) scale(${0.96 + enter * 0.04})`,
          }}
        />
        <HeroText
          title={
            <>
              Power Toybox
              <br />
              Deck
            </>
          }
          subtitle="Put your Microsoft PowerToys utilities, hotkeys, Run aliases and Command Palette entries on Stream Deck."
        />
      </div>
    </AbsoluteFill>
  );
};

const SceneSetup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 22, mass: 0.78 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ opacity: enter, transform: `translateY(${(1 - enter) * 24}px)` }}>
        <StreamDeckSetup />
      </div>
    </AbsoluteFill>
  );
};

const SceneSync: React.FC = () => {
  const frame = useCurrentFrame();
  const changed = frame > 190;
  const pulse = interpolate(frame, [170, 220, 320], [0, 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 80 }}>
        <div>
          <StreamDeck activeIndex={0} changed={changed} scale={1.02} />
          <div
            style={{
              marginTop: 24,
              display: "flex",
              justifyContent: "center",
              gap: 12,
              opacity: pulse,
            }}
          >
            <Badge color={COLORS.green}>Title refreshed</Badge>
            <Badge>Shortcut updated</Badge>
          </div>
        </div>
        <SettingsSyncPanel changed={changed} />
      </div>
    </AbsoluteFill>
  );
};

const SceneCatalog: React.FC = () => {
  const frame = useCurrentFrame();
  const showRun = frame < 230;
  const shotItems = showRun ? runCommands : keyboardCommands;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 74 }}>
        <PropertyInspector
          items={shotItems}
          activeFilter={showRun ? "Run" : "CmdPal"}
          search={showRun ? "Run aliases" : "Command Palette"}
          title={showRun ? "Shell" : "CmdPal"}
        />
        <div style={{ maxWidth: 720 }}>
          <HeroText
            badge={showRun ? "PowerToys Run aliases" : "Command Palette and Keyboard Manager"}
            title={
              showRun ? (
                <>
                  Aliases stay
                  <br />
                  in sync
                </>
              ) : (
                <>
                  Your setup,
                  <br />
                  mirrored
                </>
              )
            }
            subtitle={
              showRun
                ? "Change an ActionKeyword in PowerToys Run and the Stream Deck inspector follows automatically."
                : "Pinned commands, aliases and Keyboard Manager mappings are read from the same local settings files PowerToys uses."
            }
          />
          <div style={{ marginTop: 34, display: "flex", gap: 14, flexWrap: "wrap" }}>
            {(showRun ? ["Run", "ActionKeyword", "Typed query"] : ["CmdPal", "Keyboard Manager", "default.json"]).map(
              (label, index) => (
                <Badge key={label} color={index === 0 ? COLORS.orange : COLORS.cyan}>
                  {label}
                </Badge>
              ),
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneFeatures: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 312px)", gap: 22 }}>
      <FeatureCard
        kind="utility"
        title="Official utilities"
        detail="Quick Access entries launch through PowerToys events when available."
      />
      <FeatureCard
        kind="hotkey"
        title="Live hotkeys"
        detail="Keys resolve the current shortcut instead of storing an old copy."
      />
      <FeatureCard
        kind="run"
        title="Run aliases"
        detail="PowerToys Run plugins and ActionKeywords appear in the inspector."
      />
      <FeatureCard
        kind="cmdpal"
        title="Command Palette"
        detail="Aliases, pinned commands and command hotkeys are grouped together."
      />
      <FeatureCard
        kind="keyboard"
        title="Keyboard Manager"
        detail="Mappings from default.json are visible with stable item IDs."
      />
      <FeatureCard
        kind="utility"
        title="Automatic refresh"
        detail="File watchers update visible Stream Deck keys when PowerToys changes."
      />
    </div>
  </AbsoluteFill>
);

const Closing: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
    <Img src={staticFile("plugin-icon-large.png")} style={{ width: 210, height: 210, marginBottom: 32 }} />
    <div style={{ color: COLORS.text, fontSize: 84, fontWeight: 950, lineHeight: 1 }}>Power Toybox Deck</div>
    <div style={{ marginTop: 20, color: COLORS.muted, fontSize: 31, fontWeight: 720 }}>
      An unofficial Stream Deck companion for Microsoft PowerToys
    </div>
    <div style={{ marginTop: 34, display: "flex", gap: 14 }}>
      {["Utilities", "Hotkeys", "Run", "CmdPal", "Keyboard Manager"].map((label) => (
        <Badge key={label}>{label}</Badge>
      ))}
    </div>
  </AbsoluteFill>
);

export const PowerToyboxPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const musicVolume = interpolate(frame, [0, 90, 1980, 2100], [0, 0.46, 0.46, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <Background />
      <Audio src={staticFile("powertoybox-mixkit-close-up.mp3")} volume={musicVolume} />
      <Sequence from={0} durationInFrames={320}>
        <SceneHero />
      </Sequence>
      <Sequence from={300} durationInFrames={480}>
        <SceneSetup />
      </Sequence>
      <Sequence from={740} durationInFrames={470}>
        <SceneSync />
      </Sequence>
      <Sequence from={1160} durationInFrames={520}>
        <SceneCatalog />
      </Sequence>
      <Sequence from={1640} durationInFrames={260}>
        <SceneFeatures />
      </Sequence>
      <Sequence from={1880} durationInFrames={220}>
        <Closing />
      </Sequence>
    </AbsoluteFill>
  );
};

export const PowerToyboxThumbnail: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <Background />
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 86,
        padding: "0 110px",
      }}
    >
      <div style={{ display: "grid", placeItems: "center", gap: 26 }}>
        <StreamDeck activeIndex={0} changed scale={0.92} />
        <Badge color={COLORS.green}>Always synced with PowerToys</Badge>
      </div>
      <HeroText
        badge="PowerToys on Stream Deck"
        title={
          <>
            One key.
            <br />
            Live shortcuts.
          </>
        }
        subtitle="Utilities, Run aliases, Command Palette entries and Keyboard Manager mappings follow your local PowerToys settings."
      />
    </AbsoluteFill>
  </AbsoluteFill>
);

export const GalleryHero: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <Background />
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: "0 110px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 78 }}>
        <Img src={staticFile("plugin-icon-large.png")} style={{ width: 330, height: 330, objectFit: "contain" }} />
        <HeroText
          title={
            <>
              A Stream Deck
              <br />
              toybox for PowerToys
            </>
          }
          subtitle="Pick commands from your local PowerToys catalog. Existing keys update as settings change."
        />
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

export const GalleryPropertyInspector: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <Background />
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 86,
        padding: "0 120px",
      }}
    >
      <PropertyInspector items={quickCommands} activeFilter="Quick Access" title="Color" />
      <div style={{ maxWidth: 720 }}>
        <HeroText
          badge="Synchronized Property Inspector"
          title={
            <>
              Browse
              <br />
              PowerToys entries
            </>
          }
          subtitle="Commands are grouped by Quick Access, hotkeys, Run aliases, Command Palette and Keyboard Manager."
        />
        <div style={{ marginTop: 30, display: "flex", gap: 14, flexWrap: "wrap" }}>
          {["Stable item IDs", "Auto title", "Manual refresh"].map((label) => (
            <Badge key={label}>{label}</Badge>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

export const GallerySync: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <Background />
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 82,
        padding: "0 120px",
      }}
    >
      <StreamDeck activeIndex={0} changed scale={1.02} />
      <div>
        <SettingsSyncPanel changed />
        <div style={{ marginTop: 24, display: "flex", gap: 14 }}>
          <Badge color={COLORS.green}>File watcher refresh</Badge>
          <Badge>Runtime resolution</Badge>
        </div>
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

const InspectorStill: React.FC<{
  title: string;
  subtitle: string;
  items: CommandItem[];
  activeFilter: string;
  search: string;
  keyTitle: string;
}> = ({ title, subtitle, items, activeFilter, search, keyTitle }) => (
  <AbsoluteFill style={{ fontFamily: FONT, background: COLORS.bg, alignItems: "center", justifyContent: "center" }}>
    <Background />
    <div style={{ transform: "scale(1.42)", transformOrigin: "center" }}>
      <PropertyInspector items={items} activeFilter={activeFilter} search={search} title={keyTitle} height={860} />
    </div>
    <div
      style={{
        position: "absolute",
        left: 54,
        right: 54,
        bottom: 46,
        color: COLORS.text,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 44, fontWeight: 950 }}>{title}</div>
      <div style={{ marginTop: 10, color: COLORS.muted, fontSize: 23, fontWeight: 700 }}>{subtitle}</div>
    </div>
  </AbsoluteFill>
);

export const InspectorQuickAccess: React.FC = () => (
  <InspectorStill
    title="Quick Access and hotkeys"
    subtitle="Utilities and global shortcuts grouped in one catalog"
    items={quickCommands}
    activeFilter="Quick Access"
    search="Search PowerToys"
    keyTitle="Color"
  />
);

export const InspectorRun: React.FC = () => (
  <InspectorStill
    title="PowerToys Run aliases"
    subtitle="ActionKeywords appear as selectable Stream Deck commands"
    items={runCommands}
    activeFilter="Run"
    search="Run aliases"
    keyTitle="Shell"
  />
);

export const InspectorKeyboard: React.FC = () => (
  <InspectorStill
    title="Command Palette and Keyboard Manager"
    subtitle="Aliases, pinned commands and mappings stay visible"
    items={keyboardCommands}
    activeFilter="CmdPal"
    search="Command Palette"
    keyTitle="CmdPal"
  />
);
