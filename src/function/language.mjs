export function normalizeLanguage(language) {
	return String(language ?? "")
		.trim()
		.toLowerCase()
		.replaceAll("_", "-");
}

export function isSamePrimaryLanguage(first, second) {
	const firstLanguage = normalizeLanguage(first).split("-")[0];
	const secondLanguage = normalizeLanguage(second).split("-")[0];
	return Boolean(firstLanguage && secondLanguage && firstLanguage === secondLanguage);
}

export function resolveLanguage(language, languages) {
	const key = normalizeLanguage(language).toUpperCase();
	return languages?.[key] ?? language;
}
