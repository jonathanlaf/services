import importlib.util
import json
import os
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, '..', '.githooks', 'check-i18n.py')
spec = importlib.util.spec_from_file_location('check_i18n', SCRIPT)
ci = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ci)

FR_EN = {'fr': 'a', 'en': 'a'}
TARIFS = {'groupes': [
    {'id': 'main-oeuvre', 'titre': FR_EN, 'lignes': [
        {'id': 'taux-horaire', 'nom': FR_EN, 'prix': 35, 'unite': 'heure', 'note': FR_EN},
        {'id': 'nettoyage', 'nom': FR_EN, 'taux': 'horaire'},
        {'id': 'recuperation', 'nom': FR_EN, 'evaluation': True}]}]}


def tarifs(**change):
    data = json.loads(json.dumps(TARIFS))
    data['groupes'][0]['lignes'][0].update(change)
    return data


class Pure(unittest.TestCase):
    def test_twin(self):
        self.assertEqual(ci.twin('shared/a.html'), 'shared/a.en.html')
        self.assertEqual(ci.twin('shared/a.en.html'), 'shared/a.html')

    def test_pairs(self):
        self.assertEqual(ci.pair_problems(['shared/a.html', 'shared/a.en.html']), [])
        self.assertEqual(len(ci.pair_problems(['shared/a.html'])), 1)
        self.assertEqual(len(ci.pair_problems(['shared/b.en.html'])), 1)
        self.assertEqual(ci.pair_problems(['index.html', 'shared/tarifs.json']), [])

    def test_label_keys_skip_comments(self):
        html = '<!-- <span data-text="x">x</span> -->\n<span data-text="a">A</span><span data-text="b">B</span>'
        self.assertEqual(ci.label_keys(html), ['a', 'b'])

    def test_label_values(self):
        self.assertEqual(ci.label_values('<span data-text="tel"> 418-391-1620 </span>'), {'tel': '418-391-1620'})

    def test_view_ids(self):
        self.assertEqual(ci.view_ids('<section data-view="tarifs" data-title="T"></section>'), ['tarifs'])

    def test_tarifs_ok(self):
        self.assertEqual(ci.tarifs_problems(TARIFS), [])

    def test_tarifs_not_object(self):
        self.assertEqual(len(ci.tarifs_problems([])), 1)

    def test_tarifs_missing_english(self):
        self.assertEqual(len(ci.tarifs_problems(tarifs(nom={'fr': 'a', 'en': ''}))), 1)

    def test_tarifs_bad_unit(self):
        self.assertEqual(len(ci.tarifs_problems(tarifs(unite='jour'))), 1)

    def test_tarifs_negative_or_text_price(self):
        self.assertEqual(len(ci.tarifs_problems(tarifs(prix=-1))), 1)
        self.assertEqual(len(ci.tarifs_problems(tarifs(prix='35'))), 1)
        self.assertEqual(len(ci.tarifs_problems(tarifs(prix=True))), 1)

    def test_tarifs_needs_exactly_one_kind(self):
        self.assertEqual(len(ci.tarifs_problems(tarifs(taux='horaire'))), 1)
        line = {'id': 'x', 'nom': FR_EN}
        data = json.loads(json.dumps(TARIFS)); data['groupes'][0]['lignes'].append(line)
        self.assertEqual(len(ci.tarifs_problems(data)), 1)

    def test_tarifs_hourly_needs_rate_line(self):
        data = json.loads(json.dumps(TARIFS)); del data['groupes'][0]['lignes'][0]
        self.assertEqual(len(ci.tarifs_problems(data)), 1)

    def test_tarifs_duplicate_ids(self):
        data = json.loads(json.dumps(TARIFS)); data['groupes'][0]['lignes'][1]['id'] = 'taux-horaire'
        self.assertEqual(len(ci.tarifs_problems(data)), 1)

    def test_slugs_ok(self):
        self.assertEqual(ci.slug_problems({'en': {'tarifs': 'prices'}, 'aliases': {}}), [])

    def test_slugs_bad_word(self):
        self.assertEqual(len(ci.slug_problems({'en': {'tarifs': 'Prices!'}, 'aliases': {}})), 1)

    def test_slugs_duplicate_english(self):
        self.assertEqual(len(ci.slug_problems({'en': {'tarifs': 'prices', 'prix': 'prices'}, 'aliases': {}})), 1)

    def test_slugs_alias_is_live(self):
        self.assertEqual(len(ci.slug_problems({'en': {}, 'aliases': {'tarifs': 'contact'}}, frozenset({'tarifs'}))), 1)

    def test_phone_same_in_both(self):
        same = '<span data-text="tel">418</span><span data-text="tel-lien">+14183911620</span><span data-text="courriel">a@b.ca</span>'
        files = {'shared/libelles.html': same, 'shared/libelles.en.html': same}
        self.assertEqual(ci.phone_problems(files.get), [])
        files['shared/libelles.en.html'] = files['shared/libelles.en.html'].replace('+14183911620', '+14183911621')
        self.assertEqual(len(ci.phone_problems(files.get)), 1)

    def test_phone_link_digits_only(self):
        files = {'shared/libelles.html': '<span data-text="tel">418</span><span data-text="tel-lien">418-391</span><span data-text="courriel">a@b.ca</span>'}
        files['shared/libelles.en.html'] = files['shared/libelles.html']
        self.assertEqual(len(ci.phone_problems(files.get)), 1)


    def test_slugs_non_string_reported_not_crash(self):
        self.assertEqual(len(ci.slug_problems({'en': {'tarifs': ['prices']}, 'aliases': {'x': {}}})), 2)

    def test_tarifs_non_string_id_reported_not_crash(self):
        data = json.loads(json.dumps(TARIFS)); data['groupes'][0]['lignes'][1]['id'] = ['x']; data['groupes'][0]['lignes'][2]['id'] = ['x']
        self.assertEqual(len(ci.tarifs_problems(data)), 2)

    def test_phone_missing_reported(self):
        files = {'shared/libelles.html': '<span data-text="a">A</span>', 'shared/libelles.en.html': '<span data-text="a">A</span>'}
        self.assertEqual(len(ci.phone_problems(files.get)), 3)


    def test_slugs_english_word_is_another_page_id(self):
        self.assertEqual(len(ci.slug_problems({'en': {'services': 'contact'}, 'aliases': {}}, frozenset({'services', 'contact'}))), 1)
        self.assertEqual(ci.slug_problems({'en': {'services': 'services'}, 'aliases': {}}, frozenset({'services'})), [])


    def test_email_same_in_both(self):
        fr = '<span data-text="tel">418</span><span data-text="tel-lien">+14183911620</span><span data-text="courriel">a@b.ca</span>'
        files = {'shared/libelles.html': fr, 'shared/libelles.en.html': fr.replace('a@b.ca', 'x@b.ca')}
        self.assertEqual(len(ci.phone_problems(files.get)), 1)


if __name__ == '__main__':
    unittest.main()
