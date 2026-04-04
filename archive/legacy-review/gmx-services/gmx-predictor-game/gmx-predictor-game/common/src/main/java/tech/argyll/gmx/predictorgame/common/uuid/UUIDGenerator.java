package tech.argyll.gmx.predictorgame.common.uuid;

import org.apache.commons.codec.binary.Base64;

import java.nio.ByteBuffer;

public class UUIDGenerator {

    public static String uuid() {
        return uuidToBase64(java.util.UUID.randomUUID());
    }

    public static String uuidToBase64(java.util.UUID uuid) {
        ByteBuffer bb = ByteBuffer.wrap(new byte[16]);
        bb.putLong(uuid.getMostSignificantBits());
        bb.putLong(uuid.getLeastSignificantBits());
        return Base64.encodeBase64URLSafeString(bb.array());
    }
}
