package it.lorenzodipi.journeyplanner;

import android.os.CancellationSignal;

import androidx.core.content.ContextCompat;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CreatePasswordRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetPasswordOption;
import androidx.credentials.PasswordCredential;
import androidx.credentials.exceptions.CreateCredentialCancellationException;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.GetCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Gestore delle password di Android (Credential Manager), per la pagina di accesso.
 * - salva: dopo l'accesso propone di salvare email e password. Nella WebView il riquadro «Salvare la password?» non
 *   compare da solo: l'accesso non cambia pagina, quindi Android non capisce che il modulo è stato inviato.
 * - recupera: apre il riquadro di sistema con le password salvate per l'app. Il suggerimento della tastiera non le
 *   propone: nella WebView i campi appartengono a «localhost», non all'app che le ha salvate.
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

    @PluginMethod
    public void recupera(PluginCall call) {
        CredentialManager gestore = CredentialManager.create(getContext());
        GetCredentialRequest richiesta = new GetCredentialRequest.Builder()
            .addCredentialOption(new GetPasswordOption())
            .build();
        gestore.getCredentialAsync(
            getActivity(),
            richiesta,
            new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse risposta) {
                    JSObject ret = new JSObject();
                    Credential credenziale = risposta.getCredential();
                    if (credenziale instanceof PasswordCredential) {
                        PasswordCredential p = (PasswordCredential) credenziale;
                        ret.put("trovata", true);
                        ret.put("username", p.getId());
                        ret.put("password", p.getPassword());
                    } else {
                        ret.put("trovata", false);
                    }
                    call.resolve(ret);
                }

                @Override
                public void onError(GetCredentialException e) {
                    // nessuna password salvata o riquadro chiuso: si scrive a mano, come sempre
                    JSObject ret = new JSObject();
                    ret.put("trovata", false);
                    ret.put("motivo", e.getType());
                    call.resolve(ret);
                }
            }
        );
    }
}
