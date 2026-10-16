const test = require('node:test');
const assert = require('node:assert/strict');
const { TIME_CONFIG, getTimeProfile, calculateTimeGains, describeTimeGain } = require('../js/time-simulator.js');

const examples = [
  ['medecine-esthetique', { rappels: 6, devis: 3 }, [3.5, 4.5], [160, 205]],
  ['spa-hotelier', { demandes: 4, echanges: 4, analyse: 2 }, [3.5, 5], [165, 230]],
  ['thalasso-thermal', { dossiers: 5, echanges: 4, avis: 2 }, [3.75, 5.5], [175, 255]],
  ['instituts-independantes', { suivi: 4, messages: 2, contenus: 3 }, [3, 4.5], [140, 205]]
];

test('Le profil par défaut est le spa et les anciennes tâches restent désactivées', () => {
  assert.equal(getTimeProfile().id, 'spa-hotelier');
  assert.equal(getTimeProfile('inconnu').id, 'spa-hotelier');
  assert.equal(TIME_CONFIG.profiles.length, 4);
  assert(TIME_CONFIG.tasks.every(task => task.enabled === false));
});

for (const [id, hours, weekly, annual] of examples) {
  const profile = getTimeProfile(id);
  test(`${id} : six tâches et exemple nominal du bandeau`, () => {
    assert.equal(profile.tasks.length, 6);
    assert.equal(new Set(profile.tasks.map(task => task.id)).size, 6);
    const result = calculateTimeGains(profile.tasks, hours);
    assert.deepEqual(result.weekly, weekly);
    assert.deepEqual(result.annual, annual);
  });
  test(`${id} : plafond, bornes égales et petite saisie`, () => {
    const task = profile.tasks.find(task => task.low === 0.4 && task.high === 0.7);
    const capped = calculateTimeGains(profile.tasks, { [task.id]: 20 });
    assert.deepEqual(capped.weekly, [8, 10]);
    assert.deepEqual(capped.annual, [370, 460]);
    const equal = calculateTimeGains(profile.tasks, { [task.id]: 2 });
    assert.deepEqual(equal.weekly, [.75, 1]);
    assert.equal(describeTimeGain(equal.weekly, true), '45\u00a0min à 1\u00a0h');
    assert.deepEqual(equal.annual, [35, 45]);
    const tiny = calculateTimeGains(profile.tasks, { [task.id]: 1 / 12 });
    assert.deepEqual(tiny.weekly, [0, 0]);
    assert.equal(describeTimeGain(tiny.weekly, true), 'moins de 15\u00a0min');
  });
  test(`${id} : tout à zéro`, () => {
    assert.deepEqual(calculateTimeGains(profile.tasks, {}), { total: 0, weekly: [0, 0], annual: [0, 0] });
  });
  test(`${id} : plafond respecté pour chaque pas de cinq minutes et chaque tâche`, () => {
    for (const task of profile.tasks) {
      for (let minutes = 5; minutes <= 1200; minutes += 5) {
        const hours = minutes / 60;
        const result = calculateTimeGains(profile.tasks, { [task.id]: hours });
        assert(result.weekly[0] <= result.weekly[1]);
        assert(result.weekly.every(value => value <= hours / 2));
        assert(result.weekly.every(value => Number.isInteger(value * 4)));
        assert(result.annual.every(value => value % 5 === 0));
      }
    }
  });
}

test('Format français et exclusion des tâches désactivées', () => {
  assert.equal(describeTimeGain([3.5, 4.5], true), '3\u00a0h\u00a030 à 4\u00a0h\u00a030');
  assert.equal(describeTimeGain([1000, 2000]), '1\u202f000 à 2\u202f000 h');
  assert.deepEqual(calculateTimeGains([{ id: 'disabled', low: 1, high: 1, enabled: false }], { disabled: 20 }).weekly, [0, 0]);
});

const { interpolateTimeCount } = require('../js/time-count.js');
for (const [id, hours] of examples) {
  test(`${id} : l’animation termine sur les valeurs calculées, avec les mêmes pas`, () => {
    const result = calculateTimeGains(getTimeProfile(id).tasks, hours);
    for (const [to, step] of [[result.weekly, .25], [result.annual, 5]]) {
      for (const from of [to.map(() => 0), [100, 200]]) {
        for (const progress of [0, .1, .35, .75, 1, 2]) {
          const values = interpolateTimeCount(from, to, progress, step);
          assert(values.every(value => Number.isInteger(value / step)));
          if (progress >= 1) assert.deepEqual(values, to);
        }
      }
    }
  });
}

const { formatTimeDuration } = require('../js/time-count.js');
test('Durées en minutes, heures entières et heures avec minutes', () => {
  for (const [hours, text] of [[0, '0\u00a0h'], [1/3, '20\u00a0min'], [.75, '45\u00a0min'], [1, '1\u00a0h'], [1.25, '1\u00a0h\u00a015'], [2.5, '2\u00a0h\u00a030'], [20, '20\u00a0h']]) {
    assert.equal(formatTimeDuration(hours), text);
  }
  assert.equal(describeTimeGain([3, 4.5], true), '3\u00a0h à 4\u00a0h\u00a030');
  assert.equal(describeTimeGain([2.5, 2.5], true), 'environ 2\u00a0h\u00a030');
});
test('Quart d’heure le plus proche et quart inférieur lorsque le plafond s’applique', () => {
  const tasks = [{id:'a',low:.4,high:.7}];
  assert.deepEqual(calculateTimeGains(tasks, {a: 2.5}).weekly, [1, 1.25]);
  assert.deepEqual(calculateTimeGains(tasks, {a: 2.75}).weekly, [1, 1.25]);
  assert.deepEqual(calculateTimeGains(tasks, {a: 1/3}).weekly, [0, 0]);
});
