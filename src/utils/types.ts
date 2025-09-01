export interface AvaiabilityResult {
	platform: 'npm' | 'github';
	available: boolean | null;
	url?: string;
	message?: string;
	error?: string;
}
