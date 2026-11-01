package ru.shag.quit;
import android.content.*;
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent i) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(i.getAction())) ReminderReceiver.schedule(c, c.getSharedPreferences("local", Context.MODE_PRIVATE).getBoolean("reminder", false));
    }
}
