package it.lorenzodipi.journeyplanner;

import android.os.CancellationSignal;

import androidx.core.content.ContextCompat;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CreatePasswordRequest;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.exceptions.CreateCredentialCancellationException;
import androidx.credentials.exceptions.CreateCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Dopo l'accesso propone di salvare email e password nel gestore delle password di Android (Credential Manager).
 * Nella WebView il riquadro «Salvare la password?» non compare da solo: l'accesso non cambia pagina, quindi Android
 * non capisce che il modulo è stato inviato. Qui lo si chiede esplicitamente.
 */
@CapacitorPlugin(name = "SalvaPassword")
public class SalvaPassword extends Plugin {

    @PluginMethod
    public void salva(PluginCall call) {
        String utente = call.getString("username", "");
        String password = call.getString("password", "");
        if (utente.isEmpty() || password.isEmpty()) {
            call.reject("Mancano email o password");
            return;
        }
        CredentialManager gestore = CredentialManager.create(getContext());
        CreatePasswordRequest richiesta = new CreatePasswordRequest(utente, password);
        gestore.createCredentialAsync(
            getActivity(),
            richiesta,
            new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                @Override
                public void onResult(CreateCredentialResponse risposta) {
                    JSObject ret = new JSObject();
                    ret.put("salvata", true);
                    call.resolve(ret);
                }

                @Override
                public void onError(CreateCredentialException e) {
                    // «No, grazie» o riquadro chiuso: non è un errore per l'app
                    JSObject ret = new JSObject();
                    ret.put("salvata", false);
                    ret.put("annullata", e instanceof CreateCredentialCancellationException);
                    ret.put("motivo", e.getType());
                    call.resolve(ret);
                }
            }
        );
    }
}
