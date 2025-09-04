// @ts-expect-error
import synonyms from 'synonyms';

export function toHyphenCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.toLowerCase()
		.replace(/_/g, '-');
}

export function generateAlternatives(originalName: string): string[] {
	const alternatives = new Set<string>();
	const normalized = toHyphenCase(originalName);
	const words = normalized.split('-');
	const commonSuffixes = [
		'js',
		'ts',
		'api',
		'core',
		'lib',
		'kit',
		'pro',
		'plus',
	];
	const commonPrefixes = ['my', 'super', 'easy', 'pro', 'ultra'];
	const contextWords = ['utils', 'helper', 'toolkit', 'framework', 'module'];

	// Base + suffixes
	commonSuffixes.forEach((suffix) => {
		alternatives.add(`${normalized}-${suffix}`);
	});

	// Base + prefixes
	commonPrefixes.forEach((prefix) => {
		alternatives.add(`${prefix}-${normalized}`);
	});

	// Base + context words (as suffixes)
	contextWords.forEach((word) => {
		alternatives.add(`${normalized}-${word}`);
	});

	// Separator variations
	alternatives.add(normalized.replace(/-/g, '_')); // Hyphen to underscore
	if (words.length > 1) {
		alternatives.add(words.join('')); // No separator (if multi-word)
	}

	// Synonyms (replace one word at a time to limit combinations)
	if (synonyms) {
		words.forEach((word: string, i: number) => {
			const synonymDict = synonyms(word);
			const syns: string[] = synonymDict
				? (Object.values(synonymDict).flat() as string[])
				: [];
			syns.slice(0, 3).forEach((syn: string) => {
				// Limit to top 3 synonyms per word
				const newWords = [...words];
				newWords[i] = syn;
				alternatives.add(newWords.join('-'));
			});
		});
	}

	// Remove original and limit to 30
	alternatives.delete(normalized);
	return Array.from(alternatives).slice(0, 30);
}
