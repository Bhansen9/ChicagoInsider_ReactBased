import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, ActivityIndicator, Image, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { API_BASE_URL } from '@/constants/api';

type Place = {
  name: string;
  category?: string;
  price?: string;
  neighborhood?: string;
  description?: string;
  imageUrl?: string;
  vibes?: string[];
  matchReason?: string;
};

const categoryChips = ['Any', 'Food', 'Bar', 'Landmark', 'Activity'];
const budgetChips = ['Any', 'cheap', 'moderate', 'expensive'];

const PLACE_IMAGE_FALLBACKS: Record<string, string> = {
  'Millennium Park': 'https://commons.wikimedia.org/wiki/Special:FilePath/Millennium%20park%2Cchicago.JPG?width=900',
  'Chicago Riverwalk': 'https://commons.wikimedia.org/wiki/Special:FilePath/Chicago%20Riverwalk%20%2851556708640%29.jpg?width=900',
};

const formatLabel = (value?: string) => String(value || '').replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

export default function HomeScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('Loading curated Chicago spots...');
  const [prompt, setPrompt] = useState('');
  const [filters, setFilters] = useState({ neighborhood: '', category: '', budget: '', vibe: '' });

  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const hasResults = useMemo(() => places.length > 0, [places]);

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setError('');

    try {
      const [placesResponse, filtersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/places`),
        fetch(`${API_BASE_URL}/api/places/filters`),
      ]);

      if (!placesResponse.ok || !filtersResponse.ok) throw new Error('Could not load app data.');

      const placesData = await placesResponse.json();
      setPlaces((placesData.places || []).map((p: Place) => ({ ...p, matchReason: 'From the curated Chicago places list.' })));
      setSummary('Showing curated Chicago spots.');
    } catch (err) {
      setError('Unable to load recommendations. Start the backend and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function runRecommendationSearch(searchFilters: Record<string, any>) {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchFilters),
      });

      if (!response.ok) throw new Error('Recommendation request failed');

      const data = await response.json();
      setPlaces(data.recommendations || []);
      const activeFilters = Object.entries(data.parsedFilters || {}).filter(([, v]) => !!v).map(([k, v]) => `${formatLabel(k)}: ${formatLabel(String(v))}`);

      setSummary(activeFilters.length ? `Showing ${data.recommendations.length} matches for ${activeFilters.join(', ')}.` : `Showing ${data.recommendations.length} curated Chicago spots.`);
    } catch (err) {
      setError('Could not load recommendations.');
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(field: string, value: string) {
    const next = { ...filters, [field]: value };
    setFilters(next);
    runRecommendationSearch({ ...next, prompt });
  }

  function resolveImage(place: Place) {
    if (place.imageUrl && !place.imageUrl.startsWith('/api/places/photo')) return place.imageUrl;
    return PLACE_IMAGE_FALLBACKS[place.name] || PLACE_IMAGE_FALLBACKS['Chicago Riverwalk'];
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.trendingBtn}>
          <Text style={styles.trendingText}>Trending This Week</Text>
        </TouchableOpacity>
        <Text style={styles.brand}>ChicagoInsider</Text>
        <TouchableOpacity style={styles.profileBtn}>
          <Text style={styles.profileText}>B</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Hero */}
        <View style={styles.heroWrap}>
          <Image style={styles.heroImage} source={{ uri: 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=1600&q=60' }} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Discover Chicago</Text>
            <Text style={styles.heroSubtitle}>AI-powered recommendations for restaurants, bars, parks & more</Text>

            <View style={styles.searchCardLarge}>
              <TextInput
                style={styles.inputLarge}
                placeholder="Search for places, cuisines, or vibes..."
                value={prompt}
                onChangeText={setPrompt}
                onSubmitEditing={() => runRecommendationSearch({ ...filters, prompt })}
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        </View>

        {/* Main grid: filters | results | map */}
        <View style={[styles.grid, isWide ? styles.gridRow : null]}>
          <View style={[styles.leftColumn, isWide ? styles.leftWide : null]}>
            <View style={styles.filterCard}>
              <Text style={styles.sectionTitle}>Quick Filters</Text>
              <TouchableOpacity style={[styles.chip, filters.neighborhood === '' ? styles.chipActive : null]} onPress={() => updateFilter('neighborhood', '')}>
                <Text style={[styles.chipText, filters.neighborhood === '' ? styles.chipTextActive : null]}>Any neighborhood</Text>
              </TouchableOpacity>

              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.chipsRow}>
                {categoryChips.map((item) => (
                  <TouchableOpacity key={item} style={[styles.chip, filters.category === item ? styles.chipActive : null]} onPress={() => updateFilter('category', item === 'Any' ? '' : item)}>
                    <Text style={[styles.chipText, filters.category === item ? styles.chipTextActive : null]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Budget</Text>
              <View style={styles.chipsRow}>
                {budgetChips.map((item) => (
                  <TouchableOpacity key={item} style={[styles.chip, filters.budget === item ? styles.chipActive : null]} onPress={() => updateFilter('budget', item === 'Any' ? '' : item)}>
                    <Text style={[styles.chipText, filters.budget === item ? styles.chipTextActive : null]}>{formatLabel(item)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Vibe</Text>
              <TextInput style={styles.input} placeholder="cozy, rooftop, romantic..." value={filters.vibe} onChangeText={(v) => updateFilter('vibe', v)} placeholderTextColor="#94a3b8" />
            </View>
          </View>

          <View style={[styles.centerColumn, isWide ? styles.centerWide : null]}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Recommended Chicago Spots</Text>
              <Text style={styles.resultsSummary}>{summary}</Text>
            </View>

            {loading && <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.list}>
              {places.map((item) => (
                <View key={item.name} style={styles.card}>
                  <Image style={styles.cardImage} source={{ uri: resolveImage(item) }} />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTag}>{item.category} · {item.price}</Text>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardNeighborhood}>{item.neighborhood}</Text>
                    <Text style={styles.cardDescription}>{item.description}</Text>
                    <Text style={styles.cardReason}>{item.matchReason}</Text>
                    <Text style={styles.cardVibes}>Vibes: {item.vibes?.map(formatLabel).join(', ')}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.rightColumn, isWide ? styles.rightWide : null]}>
            <View style={styles.filterCard}>
              <Text style={styles.sectionTitle}>Map Preview</Text>
              <View style={styles.mapBox}>
                <Text style={{ color: '#94a3b8' }}>Map preview unavailable — enable Google Maps key or test on device.</Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 18, paddingBottom: 40, backgroundColor: '#f8fafc' },
  title: { fontSize: 32, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  subtitle: { color: '#475569', fontSize: 16, marginBottom: 18 },
  searchCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#0f172a' },
  input: { height: 48, backgroundColor: '#f1f5f9', borderRadius: 14, paddingHorizontal: 14, fontSize: 16, color: '#0f172a', marginBottom: 12 },
  primaryButton: { backgroundColor: '#2563eb', height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  filterCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 18 },
  filterLabel: { color: '#475569', fontSize: 13, marginBottom: 10, marginTop: 8, fontWeight: '700' },
  scrollRow: { marginBottom: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#e2e8f0', marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { color: '#0f172a', fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
  resultsHeader: { marginBottom: 14 },
  resultsTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  resultsSummary: { color: '#64748b' },
  loader: { marginTop: 16 },
  errorText: { color: '#b91c1c', marginBottom: 12, fontWeight: '700' },
  list: { paddingBottom: 40 },
  card: { backgroundColor: '#ffffff', borderRadius: 22, marginBottom: 16, overflow: 'hidden' },
  cardImage: { width: '100%', height: 180, backgroundColor: '#cbd5e1' },
  cardContent: { padding: 16 },
  cardTag: { fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: '700' },
  cardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4, color: '#0f172a' },
  cardNeighborhood: { color: '#64748b', marginBottom: 12 },
  cardDescription: { fontSize: 15, color: '#334155', marginBottom: 10, lineHeight: 22 },
  cardReason: { fontSize: 14, color: '#334155', marginBottom: 10, fontStyle: 'italic' },
  cardVibes: { fontSize: 14, color: '#0f172a', fontWeight: '700' },
  /* Header */
  headerBar: { height: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'transparent' },
  trendingBtn: { backgroundColor: '#eef2ff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14 },
  trendingText: { color: '#2563eb', fontWeight: '700' },
  brand: { fontSize: 18, fontWeight: '800', color: '#2563eb' },
  profileBtn: { backgroundColor: '#2563eb', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  profileText: { color: '#fff', fontWeight: '700' },

  /* Hero */
  heroWrap: { height: 260, borderRadius: 18, overflow: 'hidden', marginBottom: 18 },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.28)' },
  heroContent: { flex: 1, padding: 24, justifyContent: 'center' },
  heroTitle: { fontSize: 36, fontWeight: '900', color: '#ffffff', marginBottom: 6, textAlign: 'center' },
  heroSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: 14 },
  searchCardLarge: { marginTop: 10, alignSelf: 'center', width: '90%', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 999, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 },
  inputLarge: { height: 52, paddingHorizontal: 18, fontSize: 16, color: '#0f172a' },

  /* Grid layout */
  grid: { marginTop: 18, flexDirection: 'column' },
  gridRow: { flexDirection: 'row', alignItems: 'flex-start' },
  leftColumn: { flex: 0 },
  centerColumn: { flex: 1 },
  rightColumn: { flex: 0 },
  leftWide: { width: '26%', marginRight: 12 },
  centerWide: { width: '48%' },
  rightWide: { width: '26%', marginLeft: 12 },
  mapBox: { height: 220, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
});
