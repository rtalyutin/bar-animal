"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FixedCosts = {
  rent: number;
  payroll: number;
  utilities: number;
  marketing: number;
  security: number;
  accounting: number;
};

type BaseInputs = {
  seats: number;
  workDays: number;
  checksPerDay: number;
  averageCheck: number;
  variablePerCheck: number;
  leasing: number | null;
  credit: number | null;
  noDebt: boolean;
};

type PanelName = "fixed" | "debt" | null;
type RunStatus = "idle" | "running" | "blocked" | "stored" | "deficit";

const INITIAL_INPUTS: BaseInputs = {
  seats: 16,
  workDays: 30,
  checksPerDay: 30,
  averageCheck: 950,
  variablePerCheck: 468.5,
  leasing: null,
  credit: null,
  noDebt: false,
};

const INITIAL_FIXED: FixedCosts = {
  rent: 100_000,
  payroll: 160_000,
  utilities: 40_000,
  marketing: 40_000,
  security: 30_000,
  accounting: 10_000,
};

const FIXED_ROWS: Array<{ key: keyof FixedCosts; label: string }> = [
  { key: "rent", label: "Аренда" },
  { key: "payroll", label: "ФОТ со взносами" },
  { key: "utilities", label: "Коммунальные" },
  { key: "marketing", label: "Маркетинг" },
  { key: "security", label: "Охрана / POS" },
  { key: "accounting", label: "Бухгалтерия" },
];

const PRESETS = [
  { label: "СТРЕСС", detail: "20 чеков", checks: 20 },
  { label: "НОЛЬ", detail: "26,3 чека", checks: 26.3 },
  { label: "БАЗА", detail: "30 чеков", checks: 30 },
];

const STEP_LABELS = [
  "КАССА ЗАГРУЖАЕТ ВЫРУЧКУ",
  "ПЕРЕМЕННЫЕ УХОДЯТ В СЛИВ",
  "ОСТАТОК СОБИРАЕТСЯ ВО ВКЛАД",
  "FIXED УХОДИТ В СЛИВ",
  "СЧИТАЕТСЯ ПОТОК ДО ДОЛГА",
  "СПИСЫВАЮТСЯ ЛИЗИНГ И КРЕДИТЫ",
  "ФИКСИРУЕТСЯ ЧИСТЫЙ ПОТОК",
  "ДЕНЬГИ ПАДАЮТ В НАКОПИТЕЛЬ",
];

const STACK_POSITIONS = [
  { left: 6.6, top: 77.2, rotate: -7 },
  { left: 62.6, top: 77.0, rotate: 7 },
  { left: 10.8, top: 74.0, rotate: 5 },
  { left: 59.2, top: 73.9, rotate: -6 },
  { left: 15.5, top: 77.3, rotate: -2 },
  { left: 55.4, top: 77.1, rotate: 3 },
  { left: 18.7, top: 73.3, rotate: 9 },
  { left: 63.8, top: 72.7, rotate: -4 },
  { left: 8.4, top: 70.8, rotate: 3 },
  { left: 57.0, top: 70.6, rotate: -9 },
  { left: 21.8, top: 77.4, rotate: -10 },
  { left: 67.0, top: 76.6, rotate: 8 },
  { left: 22.3, top: 71.2, rotate: -2 },
  { left: 52.2, top: 71.4, rotate: 5 },
];

const integer = (value: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);

const decimal = (value: number, digits = 1) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

const signedMoney = (value: number | null, positive = false) => {
  if (value === null) return "НЕИЗВЕСТНО";
  const sign = value < 0 ? "−" : value > 0 && positive ? "+" : "";
  return `${sign}${integer(Math.abs(value))} ₽`;
};

const signedCompact = (value: number | null) => {
  if (value === null) return "не введено";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${decimal(Math.abs(value) / 1000)} тыс. ₽`;
};

function InputPlate({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="input-plate">
      <img alt="" aria-hidden="true" className="input-plate-art" src="/input-display-plate-v2.png" />
      <img alt="" aria-hidden="true" className="input-glass-art" src="/flow-readout-glass.png" />
      <span>{label}</span>
      <b>
        <input
          aria-label={label}
          data-step={step}
          inputMode="decimal"
          max={max}
          min={min}
          onChange={(event) => {
            const parsed = Number(event.target.value.replace(/\s/g, "").replace(",", "."));
            if (Number.isFinite(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
          }}
          type="text"
          value={Number.isFinite(value) ? String(value).replace(".", ",") : "0"}
        />
        <small>{suffix}</small>
      </b>
    </label>
  );
}

function OdometerValue({ value, revision }: { value: number; revision: number }) {
  const rounded = Math.round(Math.abs(value));
  const rawDigits = String(rounded);
  const leadingZeroCount = Math.max(0, 6 - rawDigits.length);
  const digits = rawDigits.padStart(6, "0").split("");
  const characters = [
    ...(value < 0 ? [{ character: "−", leading: false }] : []),
    ...digits.map((character, index) => ({ character, leading: index < leadingZeroCount })),
    { character: "₽", leading: false },
  ];

  return (
    <div className="odometer" aria-label={signedMoney(value, value > 0)}>
      <div className="odometer-wheels" aria-hidden="true">
        {characters.map(({ character, leading }, index) => (
          <span
            className={`odometer-cell ${leading ? "is-leading-zero" : ""} ${character === "₽" || character === "−" ? "is-symbol" : ""}`}
            key={`${revision}-${index}-${character}`}
          >
            <img alt="" src="/odometer-cell-v2.png" />
            <b style={{ animationDelay: `${index * 34}ms` }}>{character}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function MoneyField({
  label,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number | null;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="money-field">
      <span>{label}</span>
      <b>
        <input
          aria-label={label}
          disabled={disabled}
          inputMode="numeric"
          min="0"
          onChange={(event) => {
            const raw = event.target.value.trim();
            onChange(raw === "" ? null : Math.max(0, Number(raw)));
          }}
          placeholder="не введено"
          type="number"
          value={value ?? ""}
        />
        <small>₽</small>
      </b>
    </label>
  );
}

export default function Home() {
  const [inputs, setInputs] = useState<BaseInputs>(INITIAL_INPUTS);
  const [fixed, setFixed] = useState<FixedCosts>(INITIAL_FIXED);
  const [activePanel, setActivePanel] = useState<PanelName>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [animationStep, setAnimationStep] = useState(0);
  const [reserveTotal, setReserveTotal] = useState(0);
  const [displayReserve, setDisplayReserve] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [lastMonthNet, setLastMonthNet] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);

  const metrics = useMemo(() => {
    const fixedTotal = Object.values(fixed).reduce((sum, item) => sum + item, 0);
    const monthlyChecks = inputs.checksPerDay * inputs.workDays;
    const contributionPerCheck = inputs.averageCheck - inputs.variablePerCheck;
    const revenue = monthlyChecks * inputs.averageCheck;
    const variable = monthlyChecks * inputs.variablePerCheck;
    const contribution = revenue - variable;
    const operatingCash = contribution - fixedTotal;
    const debtKnown = inputs.noDebt || (inputs.leasing !== null && inputs.credit !== null);
    const debtPayment = inputs.noDebt ? 0 : (inputs.leasing ?? 0) + (inputs.credit ?? 0);
    const netCash = debtKnown ? operatingCash - debtPayment : null;
    const breakEvenOperating =
      contributionPerCheck > 0 && inputs.workDays > 0
        ? fixedTotal / contributionPerCheck / inputs.workDays
        : 0;
    const breakEvenAfterDebt =
      debtKnown && contributionPerCheck > 0 && inputs.workDays > 0
        ? (fixedTotal + debtPayment) / contributionPerCheck / inputs.workDays
        : null;
    const turns = inputs.seats > 0 ? inputs.checksPerDay / inputs.seats : 0;

    return {
      fixedTotal,
      monthlyChecks,
      contributionPerCheck,
      revenue,
      variable,
      contribution,
      operatingCash,
      debtKnown,
      debtPayment,
      netCash,
      breakEvenOperating,
      breakEvenAfterDebt,
      turns,
    };
  }, [fixed, inputs]);

  const gate = useMemo(() => {
    if (metrics.contributionPerCheck <= 0) {
      return { title: "KILL", detail: "чек не покрывает переменные", tone: "danger" };
    }
    if (metrics.operatingCash <= 0) {
      return { title: "НЕ СХОДИТСЯ", detail: "fixed не закрыт", tone: "danger" };
    }
    if (!metrics.debtKnown) {
      return { title: "ПРОВЕРИТЬ", detail: "платежи по долгам", tone: "warning" };
    }
    if ((metrics.netCash ?? 0) <= 0) {
      return { title: "ДЕФИЦИТ", detail: "после долга ≤ 0", tone: "danger" };
    }
    return { title: "В РЕЗЕРВ", detail: "месяц можно записать", tone: "success" };
  }, [metrics]);

  const flow = useMemo(
    () => [
      { label: "ВЫРУЧКА", value: signedMoney(metrics.revenue), detail: `${integer(metrics.monthlyChecks)} чеков`, tone: "gold" },
      { label: "ПЕРЕМЕННЫЕ", value: signedMoney(-metrics.variable), detail: `${decimal(inputs.variablePerCheck)} ₽ / чек`, tone: "red" },
      { label: "ВКЛАД", value: signedMoney(metrics.contribution), detail: `${decimal(metrics.contributionPerCheck)} ₽ / чек`, tone: "gold" },
      { label: "FIXED", value: signedMoney(-metrics.fixedTotal), detail: "постоянные", tone: "red" },
      { label: "ДО ДОЛГА", value: signedMoney(metrics.operatingCash, true), detail: "операционный поток", tone: metrics.operatingCash >= 0 ? "green" : "red" },
      { label: "ЛИЗИНГ + КРЕДИТЫ", value: metrics.debtKnown ? signedMoney(-metrics.debtPayment) : "НЕИЗВЕСТНО", detail: metrics.debtKnown ? "по договорам" : "пусто ≠ 0", tone: "red" },
      { label: "ЧИСТЫЙ ПОТОК", value: signedMoney(metrics.netCash, true), detail: "в накопитель", tone: metrics.netCash !== null && metrics.netCash >= 0 ? "green" : "red" },
    ],
    [inputs.variablePerCheck, metrics],
  );

  const reserveStackCount = reserveTotal > 0
    ? Math.min(STACK_POSITIONS.length, Math.max(6, Math.ceil(reserveTotal / 15_000)))
    : 0;

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const resetRunState = () => {
    if (!isRunning) {
      setRunStatus("idle");
      setAnimationStep(0);
    }
  };

  const setInput = (
    key: Exclude<keyof BaseInputs, "leasing" | "credit" | "noDebt">,
    value: number,
  ) => {
    resetRunState();
    setInputs((current) => ({
      ...current,
      [key]: Math.max(0, Number.isFinite(value) ? value : 0),
    }));
  };

  const setDebt = (key: "leasing" | "credit", value: number | null) => {
    resetRunState();
    setInputs((current) => ({ ...current, [key]: value, noDebt: false }));
  };

  const setFixedItem = (key: keyof FixedCosts, value: number) => {
    resetRunState();
    setFixed((current) => ({
      ...current,
      [key]: Math.max(0, Number.isFinite(value) ? value : 0),
    }));
  };

  const animateReserveCounter = (from: number, to: number, startDelay: number) => {
    const frames = 24;
    for (let frame = 1; frame <= frames; frame += 1) {
      const timer = window.setTimeout(() => {
        const progress = frame / frames;
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayReserve(from + (to - from) * eased);
      }, startDelay + frame * 28);
      timersRef.current.push(timer);
    }
  };

  const pullLever = () => {
    if (isRunning) return;

    clearTimers();
    setIsRunning(true);
    setRunStatus("running");
    setAnimationStep(1);

    const finalAnimationStep = metrics.debtKnown ? 8 : 6;
    const stepDuration = 720;

    for (let step = 2; step <= finalAnimationStep; step += 1) {
      const timer = window.setTimeout(() => setAnimationStep(step), (step - 1) * stepDuration);
      timersRef.current.push(timer);
    }

    const finishDelay = finalAnimationStep * stepDuration + 120;
    const finishTimer = window.setTimeout(() => {
      setIsRunning(false);

      if (!metrics.debtKnown) {
        setRunStatus("blocked");
        setAnimationStep(6);
        return;
      }

      const delta = metrics.netCash ?? 0;
      const nextReserve = reserveTotal + delta;
      setReserveTotal(nextReserve);
      setMonthCount((current) => current + 1);
      setLastMonthNet(delta);
      setRunStatus(delta >= 0 ? "stored" : "deficit");
      setAnimationStep(8);
      animateReserveCounter(displayReserve, nextReserve, 0);
    }, finishDelay);
    timersRef.current.push(finishTimer);
  };

  const reset = () => {
    clearTimers();
    setInputs(INITIAL_INPUTS);
    setFixed(INITIAL_FIXED);
    setActivePanel(null);
    setIsRunning(false);
    setRunStatus("idle");
    setAnimationStep(0);
    setReserveTotal(0);
    setDisplayReserve(0);
    setMonthCount(0);
    setLastMonthNet(null);
  };

  const runCopy = runStatus === "running"
    ? `Шаг ${Math.min(animationStep, 8)} из 8: ${STEP_LABELS[Math.max(0, animationStep - 1)]}.`
    : runStatus === "blocked"
      ? "Стоп на долге: месяц не попал в накопитель. Введите платежи или подтвердите их отсутствие."
      : runStatus === "stored"
        ? `Месяц записан: ${signedMoney(lastMonthNet, true)} добавлено в накопительный итог.`
        : runStatus === "deficit"
          ? `Месяц записан: ${signedMoney(lastMonthNet)} вычтено из накопительного итога.`
          : "Потяните рычаг: каждый завершённый месяц изменяет общий накопительный итог.";

  const debtGateBlocked = animationStep === 6 && !metrics.debtKnown;
  const packetIsExpense = animationStep === 2 || animationStep === 4 || animationStep === 6;
  const packetAsset = packetIsExpense
    ? "/chamber-money-red.png"
    : animationStep <= 3
      ? "/chamber-money-gold.png"
      : "/cash-bundle-green.png";
  const packets = isRunning && animationStep > 0 && !debtGateBlocked
    ? Array.from({ length: packetIsExpense ? 4 : animationStep === 8 ? 5 : 3 }, (_, index) => (
        <img
          alt=""
          aria-hidden="true"
          className={`flow-packet packet-step-${animationStep} packet-${index + 1} ${packetIsExpense ? "expense-packet" : "cash-packet"}`}
          key={`${animationStep}-${index}`}
          src={packetAsset}
        />
      ))
    : null;

  return (
    <main className="cashflow-page">
      <section className="machine-shell" aria-label="Калькулятор денежного потока">
        <div className="machine-scroll">
          <section className={`machine-stage run-${runStatus} animation-step-${animationStep}`}>
            <img alt="" aria-hidden="true" className="stage-art" src="/machine-reserve-stage.png" />

            <header className="stage-header">
              <div className="stage-brand">
                <p>МИНИ-РЕСТОРАН · ТРЕФОЛЕВА 17 · 2 ЭТАЖ</p>
                <h1>ЖИВОТНОЕ — КАССОВЫЙ БОЙ</h1>
                <small>16 мест · 2 сотрудника + владелец</small>
              </div>
              <div className={`gate-chip gate-${gate.tone}`} role="status">
                <b>{gate.title}</b>
                <span>{gate.detail}</span>
              </div>
            </header>

            <div className="top-inputs" aria-label="Базовые входные данные">
              <InputPlate label="ЧЕКОВ / ДЕНЬ" max={60} min={0} onChange={(value) => setInput("checksPerDay", value)} suffix="чек." value={inputs.checksPerDay} />
              <InputPlate label="СРЕДНИЙ ЧЕК" max={2000} min={100} onChange={(value) => setInput("averageCheck", value)} suffix="₽" value={inputs.averageCheck} />
              <InputPlate label="ПЕРЕМЕННЫЕ / ЧЕК" max={1500} min={0} onChange={(value) => setInput("variablePerCheck", value)} step={0.5} suffix="₽" value={inputs.variablePerCheck} />
              <InputPlate label="ДНЕЙ" max={31} min={1} onChange={(value) => setInput("workDays", value)} suffix="дн." value={inputs.workDays} />
              <InputPlate label="МЕСТ" max={60} min={1} onChange={(value) => setInput("seats", value)} suffix="мест" value={inputs.seats} />
            </div>

            <div className="flow-cells" aria-label="Денежный поток за месяц">
              {flow.map((cell, index) => {
                const step = index + 1;
                const routeCompleted = runStatus === "stored" || runStatus === "deficit";
                const active = animationStep === step;
                const passed = (isRunning && animationStep > step) || routeCompleted;
                const chamberAsset = cell.tone === "red"
                  ? "/chamber-money-red.png"
                  : cell.tone === "green"
                    ? "/chamber-money-green.png"
                    : "/chamber-money-gold.png";
                const hasChamberMoney = index === 5
                  ? metrics.debtKnown && metrics.debtPayment > 0
                  : index === 6
                    ? metrics.netCash !== null && metrics.netCash !== 0
                    : true;
                const blocked = index === 5 && !metrics.debtKnown && (active || runStatus === "blocked");
                const connectorActive = isRunning && animationStep === step + 1;
                const connectorPassed = (isRunning && animationStep > step + 1) || routeCompleted;
                return (
                  <article className={`flow-cell tone-${cell.tone} ${active ? "active" : ""} ${passed ? "passed" : ""} ${blocked ? "blocked" : ""}`} key={cell.label}>
                    <span className="flow-number">{String(step).padStart(2, "0")}</span>
                    <span className="flow-label">{cell.label}</span>
                    <div className="flow-readout-well">
                      <img alt="" aria-hidden="true" className="flow-readout-art" src="/flow-readout-plate-v2.png" />
                      <strong>{cell.value}</strong>
                      <img alt="" aria-hidden="true" className="flow-readout-glass" src="/flow-readout-glass.png" />
                    </div>
                    <small>{cell.detail}</small>
                    {hasChamberMoney && <img alt="" aria-hidden="true" className="chamber-money" src={chamberAsset} />}
                    {index < flow.length - 1 && (
                      <img
                        alt=""
                        aria-hidden="true"
                        className={`flow-connector ${connectorActive ? "active" : ""} ${connectorPassed ? "passed" : ""}`}
                        src="/flow-connector-arrow.png"
                      />
                    )}
                  </article>
                );
              })}
            </div>

            <div className="expense-labels" aria-hidden="true">
              <span>СЛИВ ПЕРЕМЕННЫХ</span>
              <span>СЛИВ FIXED</span>
              <span>СЛИВ ДОЛГА</span>
            </div>

            <div className="money-stream" aria-hidden="true" key={`stream-${animationStep}`}>{packets}</div>
            {!isRunning && runStatus === "deficit" && <img alt="" aria-hidden="true" className="reserve-drain-token" src="/cash-expense-red.png" />}

            <div className="reserve-piles" aria-hidden="true">
              {STACK_POSITIONS.slice(0, reserveStackCount).map((position, index) => (
                <img
                  alt=""
                  className="reserve-stack"
                  key={`${monthCount}-${index}`}
                  src="/cash-bundle-green.png"
                  style={{ left: `${position.left}%`, top: `${position.top}%`, transform: `rotate(${position.rotate}deg)` }}
                />
              ))}
            </div>

            <img alt="" aria-hidden="true" className="reserve-glass-overlay" src="/reserve-glass-overlay.png" />

            <div className={`reserve-counter ${reserveTotal < 0 ? "negative" : ""}`} aria-live="polite" data-testid="reserve-total">
              <span>НАКОПЛЕНО · {monthCount} {monthCount === 1 ? "МЕСЯЦ" : "МЕС."}</span>
              <div className="odometer-bezel">
                <img alt="" aria-hidden="true" src="/odometer-bezel-wide.png" />
                <OdometerValue revision={monthCount} value={displayReserve} />
              </div>
              <small>{lastMonthNet === null ? "каждый рывок добавляет один месяц" : `последний месяц: ${signedMoney(lastMonthNet, true)}`}</small>
            </div>

            <aside className="lever-bay" aria-label="Управление месяцем">
              <button
                aria-label="Прожить месяц: потянуть рычаг"
                aria-pressed={isRunning}
                className={`lever-control ${isRunning ? "is-pulled" : ""}`}
                data-testid="month-lever"
                disabled={isRunning}
                onClick={pullLever}
                type="button"
              >
                <img alt="" aria-hidden="true" src="/arcade-lever.png" />
              </button>
              <div className="lever-copy">
                <span>{isRunning ? "ИДЁТ РАСЧЁТ" : "ПРОЖИТЬ МЕСЯЦ"}</span>
                <small>{isRunning ? STEP_LABELS[Math.max(0, animationStep - 1)] : "потяни рычаг"}</small>
              </div>
            </aside>
          </section>
        </div>

        <div className="operator-dock">
          <div className="preset-bank" aria-label="Сценарии спроса">
            {PRESETS.map((preset) => (
              <button
                className={inputs.checksPerDay === preset.checks ? "active" : ""}
                key={preset.label}
                onClick={() => setInput("checksPerDay", preset.checks)}
                type="button"
              >
                <b>{preset.label}</b>
                <small>{preset.detail}</small>
              </button>
            ))}
          </div>

          <div className="model-facts">
            <span><b>ТОЧКА НУЛЯ</b>{decimal(metrics.breakEvenOperating)} чека / день</span>
            <span><b>ОБОРОТ МЕСТА</b>{decimal(metrics.turns)} раза / день</span>
          </div>

          <div className="service-buttons">
            <button className={activePanel === "fixed" ? "active" : ""} onClick={() => setActivePanel(activePanel === "fixed" ? null : "fixed")} type="button">
              <b>FIXED</b><small>{signedCompact(-metrics.fixedTotal)}</small>
            </button>
            <button className={activePanel === "debt" ? "active" : ""} onClick={() => setActivePanel(activePanel === "debt" ? null : "debt")} type="button">
              <b>ДОЛГ</b><small>{metrics.debtKnown ? signedCompact(-metrics.debtPayment) : "проверить"}</small>
            </button>
            <button className="reset-control" onClick={reset} type="button">СБРОС</button>
          </div>
        </div>

        <div className={`run-readback readback-${runStatus}`} role="status">
          <b>{runStatus === "blocked" ? "МЕСЯЦ НЕ ЗАПИСАН" : runStatus === "running" ? "ДЕНЬГИ В ДВИЖЕНИИ" : "READBACK"}</b>
          <span>{runCopy}</span>
          <small>Маршрут: выручка → переменные → вклад → fixed → до долга → долг → накопитель.</small>
        </div>

        {activePanel === "fixed" && (
          <section className="editor-panel" aria-label="Постоянные расходы">
            <div className="editor-heading">
              <span>ШАГ 04</span>
              <b>ПОСТОЯННЫЕ РАСХОДЫ · {signedMoney(-metrics.fixedTotal)}</b>
            </div>
            <div className="fixed-grid">
              {FIXED_ROWS.map((row) => (
                <MoneyField key={row.key} label={row.label} onChange={(value) => setFixedItem(row.key, value ?? 0)} value={fixed[row.key]} />
              ))}
            </div>
          </section>
        )}

        {activePanel === "debt" && (
          <section className="editor-panel debt-panel" aria-label="Лизинг и кредиты">
            <div className="editor-heading">
              <span>ШАГ 06</span>
              <b>ПУСТОЕ ПОЛЕ ≠ 0</b>
            </div>
            <div className="debt-grid">
              <MoneyField disabled={inputs.noDebt} label="Лизинг / месяц" onChange={(value) => setDebt("leasing", value)} value={inputs.leasing} />
              <MoneyField disabled={inputs.noDebt} label="Кредиты / месяц" onChange={(value) => setDebt("credit", value)} value={inputs.credit} />
              <label className="no-debt-switch">
                <input
                  checked={inputs.noDebt}
                  onChange={(event) => {
                    resetRunState();
                    setInputs((current) => ({ ...current, noDebt: event.target.checked }));
                  }}
                  type="checkbox"
                />
                <span><b>ПЛАТЕЖЕЙ НЕТ</b><small>подтверждаю отсутствие лизинга и кредитов</small></span>
              </label>
            </div>
          </section>
        )}

        <footer className="formula-strip">
          <span>ФОРМУЛА</span>
          <b>{integer(metrics.revenue)} − {integer(metrics.variable)} = {integer(metrics.contribution)} − {integer(metrics.fixedTotal)} = {integer(metrics.operatingCash)} − {metrics.debtKnown ? integer(metrics.debtPayment) : "?"} = {metrics.netCash === null ? "?" : integer(metrics.netCash)} ₽</b>
          <small>накопительный итог после долга</small>
        </footer>
      </section>
    </main>
  );
}
