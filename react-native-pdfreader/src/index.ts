// TODO: Export all HybridObjects here for the user
import { NitroModules } from 'react-native-nitro-modules';
import type { PdfReader } from './specs/PdfReader.nitro';

export const HybridPdfReader = NitroModules.createHybridObject<PdfReader>('PdfReader');