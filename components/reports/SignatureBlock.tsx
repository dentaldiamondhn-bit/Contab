import { Image, View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  signatureArea: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20
  },
  signatureImg: {
    width: 120,
    height: 60,
    objectFit: 'contain'
  },
  sealImg: {
    width: 80,
    height: 80,
    objectFit: 'contain'
  },
  textFooter: {
    borderTop: 1,
    marginTop: 5,
    textAlign: 'center',
    fontSize: 9
  }
});

interface ContadorProfile {
  numColegiacion: string;
  firmaUrl?: string;
  selloUrl?: string;
  cargo: string;
  nombreContador?: string;
}

interface SignatureBlockProps {
  profile: ContadorProfile;
}

export const SignatureBlock = ({ profile }: SignatureBlockProps) => (
  <View style={styles.signatureArea}>
    {/* Sello Profesional a la Izquierda */}
    {profile.selloUrl && <Image src={profile.selloUrl} style={styles.sealImg} />}
    
    <View style={{ width: 200 }}>
      {/* Firma Digital al Centro */}
      {profile.firmaUrl && <Image src={profile.firmaUrl} style={styles.signatureImg} />}
      
      <Text style={styles.textFooter}>
        {profile.nombreContador || 'Contador Autorizado'} {"\n"}
        {profile.cargo} - {profile.numColegiacion}
      </Text>
    </View>
  </View>
);

export default SignatureBlock;
