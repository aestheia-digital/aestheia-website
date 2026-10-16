// Hypothèses internes modifiables, pas des statistiques.
const TIME_CONFIG = {
  weeks: 46,
  cap: 0.5,
  defaultProfile: 'spa-hotelier',
  profiles: [
    {
      "id": "medecine-esthetique",
      "label": "Médecine et chirurgie esthétiques",
      "audience": "patients",
      "tasks": [
        {
          "id": "rappels",
          "label": "Rappels de rendez-vous et consignes post-acte",
          "low": 0.4,
          "high": 0.7
        },
        {
          "id": "devis",
          "label": "Relances de devis et de paiement",
          "low": 0.35,
          "high": 0.65
        },
        {
          "id": "consentements",
          "label": "Consentements, fiches d’information et devis",
          "low": 0.3,
          "high": 0.55
        },
        {
          "id": "planning",
          "label": "Planification des consultations et du bloc",
          "low": 0.15,
          "high": 0.35
        },
        {
          "id": "avis",
          "label": "Réponses aux avis Google",
          "low": 0.35,
          "high": 0.6
        },
        {
          "id": "information",
          "label": "Newsletters et contenus d’information",
          "low": 0.3,
          "high": 0.55
        }
      ]
    },
    {
      "id": "spa-hotelier",
      "label": "Spa hôtelier",
      "audience": "clients",
      "tasks": [
        {
          "id": "demandes",
          "label": "Réponses aux demandes entrantes (mails, messages, appels manqués)",
          "low": 0.35,
          "high": 0.65
        },
        {
          "id": "echanges",
          "label": "Échanges personnalisés avant et après le soin",
          "low": 0.4,
          "high": 0.7
        },
        {
          "id": "groupes",
          "label": "Devis pour groupes et séminaires",
          "low": 0.3,
          "high": 0.55
        },
        {
          "id": "analyse",
          "label": "Analyse du taux d’occupation et du chiffre d’affaires, avec recommandations chiffrées",
          "low": 0.3,
          "high": 0.6
        },
        {
          "id": "avis",
          "label": "Réponses aux avis clients",
          "low": 0.35,
          "high": 0.6
        },
        {
          "id": "reseaux",
          "label": "Contenus et réseaux sociaux",
          "low": 0.25,
          "high": 0.45
        }
      ]
    },
    {
      "id": "thalasso-thermal",
      "label": "Thalasso et thermal",
      "audience": "clients",
      "tasks": [
        {
          "id": "dossiers",
          "label": "Dossiers de cure : questionnaires, convocations, pièces manquantes",
          "low": 0.3,
          "high": 0.55
        },
        {
          "id": "echanges",
          "label": "Échanges avant et après le séjour ou la cure",
          "low": 0.4,
          "high": 0.7
        },
        {
          "id": "demandes",
          "label": "Demandes entrantes et devis de séjours",
          "low": 0.35,
          "high": 0.65
        },
        {
          "id": "analyse",
          "label": "Analyse du taux d’occupation et du chiffre d’affaires, avec recommandations chiffrées",
          "low": 0.3,
          "high": 0.6
        },
        {
          "id": "avis",
          "label": "Réponses aux avis Google",
          "low": 0.35,
          "high": 0.6
        },
        {
          "id": "reseaux",
          "label": "Contenus et réseaux sociaux",
          "low": 0.25,
          "high": 0.45
        }
      ]
    },
    {
      "id": "instituts-independantes",
      "label": "Instituts",
      "audience": "clientes",
      "tasks": [
        {
          "id": "suivi",
          "label": "Suivi après soin et échanges avec les clientes",
          "low": 0.4,
          "high": 0.7
        },
        {
          "id": "messages",
          "label": "Réponses aux messages et aux demandes (mail, réseaux)",
          "low": 0.35,
          "high": 0.65
        },
        {
          "id": "dormantes",
          "label": "Relance des clientes dormantes",
          "low": 0.3,
          "high": 0.55
        },
        {
          "id": "avis",
          "label": "Réponses aux avis Google",
          "low": 0.35,
          "high": 0.6
        },
        {
          "id": "contenus",
          "label": "Contenus, réseaux sociaux et newsletters",
          "low": 0.25,
          "high": 0.45
        },
        {
          "id": "analyse",
          "label": "Analyse de l’activité et recommandations",
          "low": 0.3,
          "high": 0.55
        }
      ]
    }
  ],
  // Anciennes tâches conservées hors interface.
  tasks: [
    { id: 'rappels', label: 'Rappels de rendez-vous et suivi après soin', medical: 'Rappels de rendez-vous et consignes post-acte', low: 0.40, high: 0.70, enabled: false },
    { id: 'devis', label: 'Relances de devis et de paiements', low: 0.35, high: 0.65, enabled: false },
    { id: 'reporting', label: 'Reporting et indicateurs (remplissage, absences, chiffre d’affaires)', low: 0.40, high: 0.70, enabled: false },
    { id: 'avis', label: 'Réponses aux avis Google', low: 0.35, high: 0.60, enabled: false },
    { id: 'facturation', label: 'Facturation et saisie administrative', low: 0.25, high: 0.55, enabled: false },
    { id: 'newsletters', label: 'Newsletters et emails clients', medical: 'Newsletters et emails patients', low: 0.30, high: 0.55, enabled: false },
    { id: 'rendezvous', label: 'Prise de rendez-vous, appels et messages', low: 0.20, high: 0.50, enabled: false },
    { id: 'reseaux', label: 'Contenus pour les réseaux sociaux', low: 0.25, high: 0.45, enabled: false },
    { id: 'planning', label: 'Agenda et planning de l’équipe', low: 0.15, high: 0.35, enabled: false },
    { id: 'dormantes', label: 'Relance des clientes dormantes', low: 0.30, high: 0.55, excludeMedical: true, enabled: false }
  ]
};

const timeNumberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const roundTimeGain = (value, step) => Math.round(value / step) * step;

function getTimeProfile(id) {
  return TIME_CONFIG.profiles.find(profile => profile.id === id) ||
    TIME_CONFIG.profiles.find(profile => profile.id === TIME_CONFIG.defaultProfile);
}

// Plafond et arrondis conservés ; le calcul annuel utilise les gains non arrondis.
function calculateTimeGains(tasks, hours) {
  let total = 0, low = 0, high = 0;
  for (const task of tasks.filter(task => task.enabled !== false)) {
    const value = hours[task.id] || 0;
    total += value;
    low += value * task.low;
    high += value * task.high;
  }
  const cap = total * TIME_CONFIG.cap;
  low = Math.min(low, cap);
  high = Math.min(high, cap);
  const displayedCap = Math.floor(cap / 0.5) * 0.5;
  const weekly = [low, high].map(value => Math.min(roundTimeGain(value, 0.5), displayedCap));
  const annual = [low, high].map(value => roundTimeGain(value * TIME_CONFIG.weeks, 5));
  return { total, weekly, annual };
}

function describeTimeGain(values, weekly = false) {
  if (weekly && values[1] === 0) return 'moins de 0,5 h';
  if (values[0] === values[1]) return `environ ${timeNumberFormat.format(values[0])} h`;
  return `${timeNumberFormat.format(values[0])} à ${timeNumberFormat.format(values[1])} h`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TIME_CONFIG, getTimeProfile, calculateTimeGains, describeTimeGain };
}

(() => {
  if (typeof document === 'undefined') return;
  const format = timeNumberFormat;
  document.querySelectorAll('[data-time-simulator]').forEach((root, index) => {
    const host = root.querySelector('[data-time-component]');
    const prefix = `time-${index}`;
    host.innerHTML = `
      <div class="time-profiles" role="group" aria-label="Choisissez votre secteur"></div>
      <div class="time-columns">
        <form class="time-inputs">
          <fieldset>
            <legend>Heures par semaine, pour toute l’équipe</legend>
            <div class="time-tasks"></div>
            <p class="time-input-hint">Heures par semaine, pour toute l’équipe. Si votre logiciel gère déjà une tâche, laissez son curseur à 0 h.</p>
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
    let profile = getTimeProfile(requested);
    let fields = [];
    const group = host.querySelector('.time-profiles');
    const buttons = TIME_CONFIG.profiles.map(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.label;
      button.dataset.profile = item.id;
      button.addEventListener('click', () => {
        if (profile.id === item.id) return;
        profile = item;
        renderTasks();
        update();
      });
      group.append(button);
      return button;
    });

    function renderTasks() {
      tasks.replaceChildren();
      fields = profile.tasks.filter(task => task.enabled !== false).map(task => {
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
        label.textContent = task.label;
        return { task, label, input, value };
      });
    }

    function update() {
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.profile === profile.id)));
      fields.forEach(({ task, label, input, value }) => {
        const hours = `${format.format(input.valueAsNumber)} h`;
        value.textContent = hours;
        input.setAttribute('aria-valuetext', `${hours} par semaine, pour toute l’équipe`);
      });
      host.querySelector('.time-benefit').textContent =
        `Du temps pour se consacrer à l’accueil, au soin et à l’expérience des ${profile.audience}.`;
      const hours = Object.fromEntries(fields.map(({ task, input }) => [task.id, input.valueAsNumber]));
      const { total, weekly, annual } = calculateTimeGains(profile.tasks, hours);
      host.querySelector('.time-invite').hidden = total > 0;
      host.querySelector('.time-calculated').hidden = total === 0;
      email.setAttribute('aria-disabled', String(total === 0));
      if (!total) {
        email.removeAttribute('href');
        email.tabIndex = -1;
        host.querySelectorAll('.time-result-value, .time-annual').forEach(element => window.TimeCount.reset(element));
        return;
      }
      const weekText = describeTimeGain(weekly, true);
      const yearText = describeTimeGain(annual);
      window.TimeCount.animate(host.querySelector('.time-result-value'), weekly, {
        format: values => describeTimeGain(values, true)
      });
      window.TimeCount.animate(host.querySelector('.time-annual'), annual, {
        step: 5, format: values => `soit ${describeTimeGain(values)} par an`
      });
      const body = [
        `Secteur : ${profile.label}`,
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
    renderTasks();
    update();
  });
})();
