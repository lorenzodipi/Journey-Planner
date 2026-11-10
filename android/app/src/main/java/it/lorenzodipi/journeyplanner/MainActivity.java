package it.lorenzodipi.journeyplanner;

import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /** Da 600 dp di lato corto in su (pieghevole aperto, tablet) l'app gira con il dispositivo: è la soglia delle
     *  classi di larghezza «media» di Android. Sotto (telefoni, schermo esterno dei pieghevoli) resta in verticale,
     *  come prima. Piegare e aprire non riavvia l'app (configChanges nel manifest), quindi si ricontrolla qui. */
    private static final int LATO_CORTO_GRANDE_DP = 600;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        orientamentoPerLoSchermo(getResources().getConfiguration());
    }

    @Override
    public void onConfigurationChanged(Configuration nuova) {
        super.onConfigurationChanged(nuova);
        orientamentoPerLoSchermo(nuova);
    }

    private void orientamentoPerLoSchermo(Configuration c) {
        int voluto = c.smallestScreenWidthDp >= LATO_CORTO_GRANDE_DP
            ? ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;
        if (getRequestedOrientation() != voluto) setRequestedOrientation(voluto);
    }
}
