// TODO: Export specs that extend HybridObject<...> here
import { type HybridObject } from 'react-native-nitro-modules'

export interface PdfReader extends HybridObject<{
    ios: 'swift'
}> {
    add(a: number, b: number): number
}