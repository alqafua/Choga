import { C } from "./theme";

export default function ComingSoon() {
  return (
    <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:24}}>
      <div style={{textAlign:"center", color:C.muted}}>
        <div style={{fontSize:40, marginBottom:12}}>🚧</div>
        <div style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:6}}>هذا القسم قريباً</div>
        <div style={{fontSize:12}}>نعمل على إضافته في تحديث قادم</div>
      </div>
    </div>
  );
}
