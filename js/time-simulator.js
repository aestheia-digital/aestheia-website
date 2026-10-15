// Hypothèses de travail modifiables, pas des statistiques.
const TIME_CONFIG = {
  weeks: 46,
  cap: 0.5,
  tasks: [
    { id: 'rappels', label: 'Rappels de rendez-vous et suivi après soin', medical: 'Rappels de rendez-vous et consignes post-acte', low: 0.40, high: 0.70, enabled: true },
    { id: 'devis', label: 'Relances de devis et de paiements', low: 0.35, high: 0.65, enabled: true },
    { id: 'reporting', label: 'Reporting et indicateurs (remplissage, absences, chiffre d’affaires)', low: 0.40, high: 0.70, enabled: false },
    { id: 'avis', label: 'Réponses aux avis Google', low: 0.35, high: 0.60, enabled: true },
    { id: 'facturation', label: 'Facturation et saisie administrative', low: 0.25, high: 0.55, enabled: false },
    { id: 'newsletters', label: 'Newsletters et emails clients', medical: 'Newsletters et emails patients', low: 0.30, high: 0.55, enabled: false },
    { id: 'rendezvous', label: 'Prise de rendez-vous, appels et messages', low: 0.20, high: 0.50, enabled: false },
    { id: 'reseaux', label: 'Contenus pour les réseaux sociaux', low: 0.25, high: 0.45, enabled: true },
    { id: 'planning', label: 'Agenda et planning de l’équipe', low: 0.15, high: 0.35, enabled: false },
    { id: 'dormantes', label: 'Relance des clientes dormantes', low: 0.30, high: 0.55, excludeMedical: true, enabled: false }
  ]
};

(() => {
  const profiles = [
    { id: 'instituts-independantes', label: 'Institut ou indépendante' },
    { id: 'spa-hotelier', label: 'Spa hôtelier' },
    { id: 'thalasso-thermal', label: 'Thalasso et thermal' },
    { id: 'medecine-esthetique', label: 'Médecine et chirurgie esthétiques' }
  ];
  const format = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  const round = (value, step) => Math.round(value / step) * step;

  // Même calcul que la version détaillée : plafond avant arrondis, année sur le gain brut.
  function calculate(fields) {
    let total = 0, low = 0, high = 0;
    for (const { task, input } of fields) {
      const hours = input.valueAsNumber;
      total += hours;
      low += hours * task.low;
      high += hours * task.high;
    }
    const cap = total * TIME_CONFIG.cap;
    low = Math.min(low, cap);
    high = Math.min(high, cap);
    const displayedCap = Math.floor(cap / 0.5) * 0.5;
    const weekly = [low, high].map(value => Math.min(round(value, 0.5), displayedCap));
    const annual = [low, high].map(value => round(value * TIME_CONFIG.weeks, 5));
    return { total, weekly, annual };
  }

  function describe(values, weekly = false) {
    if (weekly && values[1] === 0) return 'moins de 0,5 h';
    if (values[0] === values[1]) return `environ ${format.format(values[0])} h`;
    return `${format.format(values[0])} à ${format.format(values[1])} h`;
  }

  document.querySelectorAll('[data-time-simulator]').forEach((root, index) => {
    const host = root.querySelector('[data-time-component]');
    const prefix = `time-${index}`;
    host.innerHTML = `
      <div class="time-columns">
        <form class="time-inputs">
          <fieldset>
            <legend>Heures par semaine, pour toute l’équipe</legend>
            <div class="time-tasks"></div>
          </fieldset>
        </form>
        <section class="time-results" aria-labelledby="${prefix}-estimate">
          <p class="eyebrow" id="${prefix}-estimate">VOTRE ESTIMATION</p>
          <div class="time-result" role="status" aria-live="polite" aria-atomic="true">
            <p class="time-invite">Déplacez un curseur pour voir votre gain</p>
            <div class="time-calculated" hidden>
              <p class="time-result-value"></p>
              <p class="time-week-unit">par semaine</p>
              <p class="time-annual"></p>
            </div>
          </div>
          <p class="time-benefit">Du temps pour se consacrer à l’accueil, au soin et à l’expérience client.</p>
          <div class="time-actions">
            <a class="time-action time-email" aria-disabled="true" tabindex="-1">Recevoir mon estimation détaillée</a>
            <a class="time-action time-booking" href="https://calendar.app.google/qx6dT7WJfTrsFe6j9" target="_blank" rel="noopener noreferrer">Réserver un échange de 30 minutes</a>
          </div>
          <p class="time-disclaimer">Estimation indicative, selon vos processus actuels. Aucun résultat n’est garanti.</p>
        </section>
      </div>`;
    const tasks = host.querySelector('.time-tasks');
    const email = host.querySelector('.time-email');
    const requested = new URLSearchParams(location.search).get('profil');
    const profile = profiles.find(item => item.id === requested) || { id: 'neutre', label: 'Non précisé' };

    const fields = TIME_CONFIG.tasks.filter(task => task.enabled).map(task => {
      const row = document.createElement('div');
      row.className = 'time-task';
      const labelRow = document.createElement('div');
      labelRow.className = 'time-task-heading';
      const label = document.createElement('label');
      label.htmlFor = `${prefix}-${task.id}`;
      const value = document.createElement('output');
      value.htmlFor = label.htmlFor;
      // The native slider already announces its value through aria-valuetext.
      value.setAttribute('aria-hidden', 'true');
      const input = document.createElement('input');
      input.id = label.htmlFor;
      input.dataset.task = task.id;
      input.type = 'range';
      input.min = '0';
      input.max = '20';
      input.step = '0.5';
      input.value = '0';
      labelRow.append(label, value);
      row.append(labelRow, input);
      tasks.append(row);
      return { task, label, input, value };
    });

    function update() {
      const medical = profile.id === 'medecine-esthetique';
      fields.forEach(({ task, label, input, value }) => {
        label.textContent = medical && task.medical ? task.medical : task.label;
        const hours = `${format.format(input.valueAsNumber)} h`;
        value.textContent = hours;
        input.setAttribute('aria-valuetext', `${hours} par semaine, pour toute l’équipe`);
      });
      host.querySelector('.time-benefit').textContent = medical
        ? 'Du temps pour se consacrer à l’accueil, au soin et à l’expérience des patients.'
        : profile.id === 'neutre'
          ? 'Du temps pour se consacrer à l’accueil, au soin et à l’expérience des clients ou patients.'
          : 'Du temps pour se consacrer à l’accueil, au soin et à l’expérience client.';
      const { total, weekly, annual } = calculate(fields);
      host.querySelector('.time-invite').hidden = total > 0;
      host.querySelector('.time-calculated').hidden = total === 0;
      email.setAttribute('aria-disabled', String(total === 0));
      if (!total) {
        email.removeAttribute('href');
        email.tabIndex = -1;
        return;
      }
      const weekText = describe(weekly, true);
      const yearText = describe(annual);
      host.querySelector('.time-result-value').textContent = weekText;
      host.querySelector('.time-annual').textContent = `soit ${yearText} par an`;
      const body = [
        `Profil : ${profile.label}`,
        ...fields.map(({ label, input }) => `${label.textContent} : ${format.format(input.valueAsNumber)} h par semaine`),
        '', `${weekText} par semaine`, `${yearText} par an`, '',
        'Estimation indicative, selon vos processus actuels. Aucun résultat n’est garanti.'
      ].join('\n');
      email.href = `mailto:contact@aestheia.fr?subject=${encodeURIComponent('Estimation simulateur')}&body=${encodeURIComponent(body)}`;
      email.removeAttribute('tabindex');
    }
    host.querySelector('form').addEventListener('submit', event => event.preventDefault());
    host.querySelector('form').addEventListener('input', update);
    host.querySelector('form').addEventListener('change', update);
    update();
  });
})();
