import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Yasmin.lab.rez — электронды резюме-кітаптың Java сервері.
 *
 * Сервер екі жұмыс атқарады:
 *  1) web папкасындағы беттерді (HTML, CSS, JS) браузерге береді;
 *  2) «Байланыс» формасынан келген хабарламаларды қабылдап,
 *     data/messages.txt файлына сақтайды.
 *
 * Тек стандартты Java кітапханасы қолданылған, қосымша ештеңе орнатудың қажеті жоқ.
 */
public class Server {

    static final int PORT = 8080;
    static final Path WEB = Paths.get("").toAbsolutePath(); // барлық файлдар осы папкада
    static final Path DATA_FILE = Paths.get("data", "messages.txt");
    static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    public static void main(String[] args) throws IOException {
        Files.createDirectories(DATA_FILE.getParent());

        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/api/messages", Server::handleMessages);
        server.createContext("/", Server::handleStatic);
        server.start();

        System.out.println("Server started: http://localhost:" + PORT);
        System.out.println("Messages page:  http://localhost:" + PORT + "/messages.html");
        System.out.println("Press Ctrl+C to stop.");
    }

    /* ---------- 1. API: хабарламаларды қабылдау және көрсету ---------- */
    static void handleMessages(HttpExchange ex) throws IOException {
        addCors(ex);
        String method = ex.getRequestMethod();

        if (method.equals("OPTIONS")) {            // браузердің алдын ала сұранысы
            send(ex, 204, "", "text/plain");
            return;
        }

        if (method.equals("POST")) {               // жаңа хабарлама келді
            String body = new String(readAll(ex.getRequestBody()), StandardCharsets.UTF_8);
            String name = jsonValue(body, "name").trim();
            String email = jsonValue(body, "email").trim();
            String message = jsonValue(body, "message").trim();

            // Тексеру: барлық өріс толтырылуы керек
            if (name.isEmpty() || email.isEmpty() || message.isEmpty()) {
                send(ex, 400, "{\"error\":\"Барлық өрісті толтырыңыз.\"}", "application/json");
                return;
            }
            if (!email.contains("@")) {
                send(ex, 400, "{\"error\":\"Email дұрыс емес.\"}", "application/json");
                return;
            }

            // Файлға бір жол етіп жазамыз: уақыт | аты | email | хабарлама
            String line = LocalDateTime.now().format(TIME) + " | " + clean(name) + " | "
                    + clean(email) + " | " + clean(message) + System.lineSeparator();
            synchronized (Server.class) {
                Files.write(DATA_FILE, line.getBytes(StandardCharsets.UTF_8),
                        StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            }
            System.out.println("New message from: " + name);
            send(ex, 201, "{\"status\":\"ok\"}", "application/json");
            return;
        }

        if (method.equals("GET")) {                // сақталған хабарламалар тізімі
            List<String> lines = Files.exists(DATA_FILE)
                    ? Files.readAllLines(DATA_FILE, StandardCharsets.UTF_8) : new ArrayList<>();
            StringBuilder json = new StringBuilder("[");
            for (String l : lines) {
                String[] p = l.split(" \\| ", 4);
                if (p.length < 4) continue;
                if (json.length() > 1) json.append(',');
                json.append("{\"time\":\"").append(esc(p[0]))
                    .append("\",\"name\":\"").append(esc(p[1]))
                    .append("\",\"email\":\"").append(esc(p[2]))
                    .append("\",\"message\":\"").append(esc(p[3])).append("\"}");
            }
            json.append(']');
            send(ex, 200, json.toString(), "application/json");
            return;
        }

        send(ex, 405, "{\"error\":\"Method not allowed\"}", "application/json");
    }

    /* ---------- 2. Статикалық файлдар: HTML, CSS, JS ---------- */
    static void handleStatic(HttpExchange ex) throws IOException {
        String path = ex.getRequestURI().getPath();
        if (path.equals("/")) path = "/index.html";

        Path file = WEB.resolve(path.substring(1)).normalize();
        // web папкасынан тыс файлдарды беруге болмайды
        if (!file.startsWith(WEB) || !Files.isRegularFile(file)) {
            send(ex, 404, "404 - бет табылмады", "text/plain");
            return;
        }
        byte[] bytes = Files.readAllBytes(file);
        ex.getResponseHeaders().set("Content-Type", contentType(file.toString()));
        ex.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }

    /* ---------- Көмекші әдістер ---------- */
    static String contentType(String name) {
        if (name.endsWith(".html")) return "text/html; charset=utf-8";
        if (name.endsWith(".css")) return "text/css; charset=utf-8";
        if (name.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }

    static void addCors(HttpExchange ex) {
        ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        ex.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        ex.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    static void send(HttpExchange ex, int code, String text, String type) throws IOException {
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        if (!type.contains("charset")) type += "; charset=utf-8";
        ex.getResponseHeaders().set("Content-Type", type);
        if (code == 204) {
            ex.sendResponseHeaders(204, -1);
            ex.close();
            return;
        }
        ex.sendResponseHeaders(code, bytes.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }

    /** JSON мәтінінен "key":"мән" жұбының мәнін алады (қарапайым талдау). */
    static String jsonValue(String json, String key) {
        String k = "\"" + key + "\"";
        int i = json.indexOf(k);
        if (i < 0) return "";
        i = json.indexOf(':', i + k.length());
        if (i < 0) return "";
        i = json.indexOf('"', i);
        if (i < 0) return "";
        StringBuilder sb = new StringBuilder();
        for (int j = i + 1; j < json.length(); j++) {
            char c = json.charAt(j);
            if (c == '\\' && j + 1 < json.length()) {
                char n = json.charAt(++j);
                switch (n) {
                    case 'n': sb.append(' '); break;
                    case 't': sb.append(' '); break;
                    case 'r': break;
                    case 'u':
                        if (j + 4 < json.length()) {
                            sb.append((char) Integer.parseInt(json.substring(j + 1, j + 5), 16));
                            j += 4;
                        }
                        break;
                    default: sb.append(n);
                }
            } else if (c == '"') {
                break;
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    /** Файлға жазар алдында жол ауыстыру және бөлгіш таңбаларды алып тастаймыз. */
    static String clean(String s) {
        return s.replace("\r", " ").replace("\n", " ").replace("|", "/");
    }

    /** JSON жауапқа арналған экрандау. */
    static String esc(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    // Сұраныс денесін толық оқу (Java 8-ге де сәйкес)
    static byte[] readAll(InputStream in) throws IOException {
        java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
        byte[] chunk = new byte[4096];
        int n;
        while ((n = in.read(chunk)) != -1) buf.write(chunk, 0, n);
        return buf.toByteArray();
    }
}
