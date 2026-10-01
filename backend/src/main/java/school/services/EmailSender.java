// backend/src/main/java/school/services/EmailSender.java
package school.services;

import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import school.config.Env;

import java.util.Properties;

public class EmailSender {
    public static void send(String to, String subject, String body) throws Exception {
        String mode = Env.get("EMAIL_MODE", "mock");

        if (!"live".equals(mode)) {
            System.out.println("[MOCK EMAIL] To: " + to + " | Subj: " + subject + " | Body: " + body);
            return;
        }

        String host = Env.get("SMTP_HOST");
        String port = Env.get("SMTP_PORT");
        String user = Env.get("SMTP_USER");
        String pass = Env.get("SMTP_PASS");
        String from = Env.get("EMAIL_FROM");

        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.host", host);
        props.put("mail.smtp.port", port);

        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(user, pass);
            }
        });

        Message message = new MimeMessage(session);
        message.setFrom(new InternetAddress(from));
        message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to));
        message.setSubject(subject);
        message.setText(body);

        Transport.send(message);
    }
}