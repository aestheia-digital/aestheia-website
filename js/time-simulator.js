// Hypothèses de travail, modifiables ici. Ce ne sont pas des statistiques.
const TIME_CONFIG = {
  weeks: 46,
  cap: 0.5,
  tasks: [
    { id: 'rappels', label: 'Rappels de rendez-vous et suivi après soin', medical: 'Rappels de rendez-vous et consignes post-acte', low: 0.40, high: 0.70 },
    { id: 'devis', label: 'Relances de devis et de paiements', low: 0.35, high: 0.65 },
    { id: 'reporting', label: "Reporting et indicateurs (remplissage, absences, chiffre d'affaires)", low: 0.40, high: 0.70 },
    { id: 'avis', label: 'Réponses aux avis Google (brouillons à valider)', low: 0.35, high: 0.60 },
    { id: 'facturation', label: 'Facturation et saisie administrative', low: 0.25, high: 0.55 },
    { id: 'newsletters', label: 'Newsletters et emails clients', medical: 'Newsletters et emails patients', low: 0.30, high: 0.55 },
    { id: 'rendezvous', label: 'Prise de rendez-vous, appels et messages', low: 0.20, high: 0.50 },
    { id: 'reseaux', label: 'Contenus pour les réseaux sociaux', low: 0.25, high: 0.45 },
    { id: 'planning', label: "Agenda et planning de l'équipe", low: 0.15, high: 0.35 },
    { id: 'dormantes', label: 'Relance des clientes dormantes', low: 0.30, high: 0.55, excludeMedical: true }
  ]
};

(() => {
  const form = document.getElementById('time-form');
  const profile = document.getElementById('time-profile');
  const team = document.getElementById('time-team');
  const rate = document.getElementById('time-rate');
  const result = document.getElementById('time-result');
  const email = document.getElementById('time-email');
  const tasks = document.getElementById('time-tasks');
  const format = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  const round = (value, step) => Math.round(value / step) * step;
  const selected = new URLSearchParams(location.search).get('profil');
  if (Array.from(profile.options).some(option => option.value === selected)) profile.value = selected;

  const fields = TIME_CONFIG.tasks.map(task => {
    const row = document.createElement('div');
    row.className = 'time-task';
    const label = document.createElement('label');
    label.htmlFor = `time-${task.id}`;
    const hint = document.createElement('small');
    hint.id = `hint-${task.id}`;
    hint.textContent = `Hypothèse de gain : ${task.low * 100} % à ${task.high * 100} %`;
    const input = document.createElement('input');
    input.id = label.htmlFor;
    input.type = 'number';
    input.min = '0';
    input.max = '40';
    input.step = '0.5';
    input.inputMode = 'decimal';
    input.setAttribute('aria-describedby', `time-hours-help ${hint.id}`);
    const description = document.createElement('div');
    description.append(label, hint);
    row.append(description, input);
    tasks.append(row);
    return { task, row, label, input };
  });

  function update() {
    const medical = profile.value === 'medecine-esthetique';
    for (const { task, row, label, input } of fields) {
      row.hidden = medical && Boolean(task.excludeMedical);
      input.disabled = row.hidden;
      label.textContent = medical && task.medical ? task.medical : task.label;
    }
    document.getElementById('time-benefit').textContent = medical
      ? "Du temps pour se consacrer à l'accueil, au soin et à l'expérience des patients."
      : "Du temps pour se consacrer à l'accueil, au soin et à l'expérience client.";
    email.hidden = true;
    email.removeAttribute('href');
    const active = fields.filter(field => !field.input.disabled);
    const invalid = [...active.map(field => field.input), rate].filter(input => !input.validity.valid);
    for (const input of [...fields.map(field => field.input), rate]) {
      input.setAttribute('aria-invalid', String(!input.disabled && !input.validity.valid));
    }
    if (invalid.length) {
      result.textContent = "Vérifiez les saisies : de 0 à 40 h par tâche, par pas de 0,5 h, et une valeur horaire positive ou nulle avec au plus deux décimales.";
      return;
    }
    let total = 0, low = 0, high = 0;
    const recap = active.map(({ task, label, input }) => {
      const hours = input.value === '' ? 0 : input.valueAsNumber;
      total += hours;
      low += hours * task.low;
      high += hours * task.high;
      return `${label.textContent} : ${input.value === '' ? 'non renseigné' : format.format(hours) + ' h/semaine'}`;
    });
    if (!total) {
      result.textContent = 'Renseignez au moins une tâche avec un temps supérieur à zéro pour obtenir votre estimation.';
      return;
    }
    const cap = total * TIME_CONFIG.cap;
    low = Math.min(low, cap);
    high = Math.min(high, cap);
    const displayedCap = Math.floor(cap / 0.5) * 0.5;
    const weekly = [low, high].map(value => Math.min(round(value, 0.5), displayedCap));
    const annual = [low, high].map(value => round(value * TIME_CONFIG.weeks, 5));
    const lines = [
      { values: weekly, unit: 'h par semaine' },
      { values: annual, unit: 'h par an' }
    ];
    if (rate.value !== '') {
      const euros = [low, high].map(value => round(value * TIME_CONFIG.weeks * rate.valueAsNumber, 50));
      if (!euros.every(Number.isFinite)) {
        result.textContent = "La valeur horaire saisie est trop élevée pour calculer un montant. Réduisez-la.";
        return;
      }
      lines.push({ values: euros, unit: '€ par an' });
    }
    const describe = ({ values, unit }) => {
      if (unit === 'h par semaine' && values[1] === 0) return 'Moins de 0,5 h par semaine';
      if (values[0] === values[1]) return `Environ ${format.format(values[0])} ${unit}`;
      return `Entre ${format.format(values[0])} et ${format.format(values[1])} ${unit}`;
    };
    result.replaceChildren();
    for (const line of lines) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      if (line.unit === 'h par semaine' && line.values[1] === 0) {
        p.textContent = describe(line);
      } else {
        strong.textContent = format.format(line.values[0]);
        const equal = line.values[0] === line.values[1];
        p.append(equal ? 'Environ ' : 'Entre ', strong,
          equal ? ` ${line.unit}` : ` et ${format.format(line.values[1])} ${line.unit}`);
      }
      result.append(p);
    }
    const summary = lines.map(describe);
    const body = [
      `Profil : ${profile.selectedOptions[0].textContent}`,
      `Taille de l'équipe : ${team.value}`,
      ...recap,
      ...(rate.value !== '' ? [`Valeur horaire : ${format.format(rate.valueAsNumber)} €`] : []),
      '', ...summary, '',
      `Hypothèses de travail, plafond de ${TIME_CONFIG.cap * 100} % et ${TIME_CONFIG.weeks} semaines par an.`,
      'Estimation indicative, hors temps de mise en place, selon vos processus actuels. Aucun résultat n\'est garanti.'
    ].join('\n');
    email.href = `mailto:contact@aestheia.fr?subject=${encodeURIComponent('Estimation simulateur')}&body=${encodeURIComponent(body)}`;
    email.hidden = false;
  }
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
})();
